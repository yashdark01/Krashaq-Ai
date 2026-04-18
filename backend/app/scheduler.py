import logging
import asyncio
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.db.mongodb import get_collection
from app.services.daily_decision import generate_daily_message
from app.services.whatsapp_sender import send_whatsapp_message

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create scheduler instance
scheduler = BackgroundScheduler()


def send_daily_irrigation_alerts_sync():
    """Sync wrapper for async send_daily_irrigation_alerts function."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        # Create fresh MongoDB connection for this event loop
        from app.db.mongodb import connect_to_mongodb, close_mongodb_connection
        loop.run_until_complete(connect_to_mongodb())
        
        # Run the async function
        loop.run_until_complete(send_daily_irrigation_alerts())
        
        # Close MongoDB connection
        loop.run_until_complete(close_mongodb_connection())
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        asyncio.set_event_loop(None)


async def send_daily_irrigation_alerts():
    """
    Send daily irrigation alerts to all farmers.
    This function is scheduled based on configuration.
    """
    logger.info("=" * 80)
    logger.info("DAILY IRRIGATION ALERTS JOB STARTED")
    logger.info("=" * 80)
    
    try:
        # Get database collections
        logger.info("[STEP 1] Getting MongoDB collections...")
        users_collection = get_collection("users")
        scheduler_configs_collection = get_collection("scheduler_configs")
        logger.info("[STEP 1] ✓ MongoDB collections obtained")
        
        # Update last_run timestamp
        logger.info("[STEP 2] Updating job timestamp...")
        config = await scheduler_configs_collection.find_one({"job_name": "daily_irrigation_alerts"})
        if config:
            await scheduler_configs_collection.update_one(
                {"_id": config["_id"]},
                {"$set": {"last_run": datetime.utcnow(), "updated_at": datetime.utcnow()}}
            )
            logger.info(f"[STEP 2] ✓ Job timestamp updated")
        
        # Fetch all users with role='farmer'
        logger.info("[STEP 3] Fetching farmers from database...")
        farmers = await users_collection.find({"role": "farmer"}).to_list(length=None)
        logger.info(f"[STEP 3] ✓ Found {len(farmers)} farmers to process")
        
        if len(farmers) == 0:
            logger.warning("⚠ No farmers found in database. Skipping message sending.")
            return
        
        # Display farmer list for debugging
        logger.info("-" * 80)
        logger.info("FARMER LIST FOR THIS RUN:")
        logger.info("-" * 80)
        for i, farmer in enumerate(farmers, 1):
            logger.info(f"  {i}. Name: {farmer.get('name', 'N/A')}")
            logger.info(f"     Phone: {farmer.get('phone', 'N/A')}")
            logger.info(f"     Language: {farmer.get('language', 'N/A')}")
            logger.info(f"     Soil Moisture: {farmer.get('soil_moisture', 'N/A')}")
            logger.info(f"     Created: {farmer.get('created_at', 'N/A')}")
        logger.info("-" * 80)
        
        # Process each farmer
        logger.info(f"[STEP 4] Starting message generation and sending for {len(farmers)} farmers...")
        success_count = 0
        failure_count = 0
        
        for i, farmer in enumerate(farmers, 1):
            logger.info(f"\n{'=' * 80}")
            logger.info(f"PROCESSING FARMER {i}/{len(farmers)}: {farmer.get('name', 'N/A')}")
            logger.info(f"{'=' * 80}")
            
            try:
                logger.info(f"  [DETAIL] Name: {farmer.get('name', 'N/A')}")
                logger.info(f"  [DETAIL] Phone: {farmer.get('phone', 'N/A')}")
                logger.info(f"  [DETAIL] Language: {farmer.get('language', 'N/A')}")
                logger.info(f"  [DETAIL] Soil Moisture: {farmer.get('soil_moisture', 'N/A')}")
                
                # Generate daily message
                logger.info(f"  [STEP 4.1] Generating irrigation message...")
                language = farmer.get('language', 'hi')
                message = generate_daily_message(farmer, language)
                logger.info(f"  [STEP 4.1] ✓ Message generated (length: {len(message)} chars)")
                logger.info(f"  [MESSAGE PREVIEW] {message[:200]}..." if len(message) > 200 else f"  [MESSAGE] {message}")
                
                # Send WhatsApp message
                phone = farmer.get('phone', '')
                logger.info(f"  [STEP 4.2] Sending WhatsApp message to {phone}...")
                result = send_whatsapp_message(phone, message)
                
                if result["success"]:
                    logger.info(f"  [STEP 4.2] ✓ WhatsApp message sent successfully!")
                    logger.info(f"  [SUCCESS] Message SID: {result.get('message_sid', 'N/A')}")
                    logger.info(f"  [SUCCESS] Status: {result.get('status', 'N/A')}")
                    success_count += 1
                else:
                    logger.error(f"  [STEP 4.2] ✗ Failed to send WhatsApp message")
                    logger.error(f"  [ERROR] Error: {result.get('error', 'Unknown error')}")
                    failure_count += 1
                
            except Exception as e:
                logger.error(f"  [EXCEPTION] Error processing farmer {farmer.get('name', 'N/A')}: {str(e)}")
                logger.error(f"  [EXCEPTION] Error type: {type(e).__name__}")
                failure_count += 1
                continue
        
        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("JOB EXECUTION SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total farmers processed: {len(farmers)}")
        logger.info(f"Successful sends: {success_count}")
        logger.info(f"Failed sends: {failure_count}")
        logger.info(f"Success rate: {(success_count/len(farmers)*100):.1f}%" if farmers else "N/A")
        logger.info("=" * 80)
        logger.info("DAILY IRRIGATION ALERTS JOB COMPLETED")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"JOB FAILED: Error in daily irrigation alerts job")
        logger.error("=" * 80)
        logger.error(f"Error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")


async def start_scheduler():
    """
    Start the scheduler and add jobs based on database configuration.
    """
    try:
        # Get database collections
        scheduler_configs_collection = get_collection("scheduler_configs")
        
        # Fetch all scheduler configurations
        configs = await scheduler_configs_collection.find({"enabled": True}).to_list(length=None)
        
        for config in configs:
            try:
                if config['schedule_type'] == 'daily':
                    # Daily schedule at specific time
                    scheduler.add_job(
                        send_daily_irrigation_alerts_sync,
                        'cron',
                        hour=config.get('hour', 5),
                        minute=config.get('minute', 0),
                        id=config['job_name'],
                        replace_existing=True
                    )
                    logger.info(f"Added daily job '{config['job_name']}' at {config.get('hour', 5):02d}:{config.get('minute', 0):02d}")
                    
                elif config['schedule_type'] == 'interval':
                    # Interval schedule (every X hours or minutes)
                    if config.get('interval_minutes'):
                        scheduler.add_job(
                            send_daily_irrigation_alerts_sync,
                            'interval',
                            minutes=config['interval_minutes'],
                            id=config['job_name'],
                            replace_existing=True
                        )
                        logger.info(f"Added interval job '{config['job_name']}' every {config['interval_minutes']} minutes")
                    else:
                        scheduler.add_job(
                            send_daily_irrigation_alerts_sync,
                            'interval',
                            hours=config.get('interval_hours', 4),
                            id=config['job_name'],
                            replace_existing=True
                        )
                        logger.info(f"Added interval job '{config['job_name']}' every {config.get('interval_hours', 4)} hours")
                    
                elif config['schedule_type'] == 'hourly':
                    # Hourly schedule
                    scheduler.add_job(
                        send_daily_irrigation_alerts_sync,
                        'interval',
                        hours=1,
                        id=config['job_name'],
                        replace_existing=True
                    )
                    logger.info(f"Added hourly job '{config['job_name']}'")
                    
            except Exception as e:
                logger.error(f"Failed to add job '{config['job_name']}': {str(e)}")
                continue
        
        # Start scheduler
        scheduler.start()
        logger.info(f"Scheduler started successfully. {len(configs)} jobs configured.")
        
    except Exception as e:
        logger.error(f"Failed to start scheduler: {str(e)}")


def stop_scheduler():
    """
    Stop the scheduler gracefully.
    """
    try:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")


async def reload_scheduler():
    """
    Reload the scheduler with updated configuration from database.
    This is called when admin updates scheduler configuration.
    """
    try:
        # Stop scheduler
        if scheduler.running:
            scheduler.shutdown(wait=True)
            logger.info("Scheduler stopped for reload")
        
        # Restart with new configuration
        await start_scheduler()
        logger.info("Scheduler reloaded successfully with new configuration")
        
    except Exception as e:
        logger.error(f"Error reloading scheduler: {str(e)}")
