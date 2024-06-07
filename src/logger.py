#any excution is to be logged to this file where we can find the exceptions raised 
# to track and stored 
import logging
import os 
from datetime import datetime 

LOG_FILE=f"{datetime.now().strftime('%m_%d_%Y_%H_%M_%S')}.log"
#everything that will be created will be based on the current working directory
logs_path=os.path.join(os.getcwd(),"logs",LOG_FILE)
os.makedirs(logs_path,exist_ok=True)# keep appending whenever we want to create a file 

LOG_FILE_PATH=os.path.join(logs_path,LOG_FILE)
# configuration of where i will give the log file 
logging.basicConfig(
    filename=LOG_FILE_PATH,
    format="[%(asctime)s] %(lineno)d %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    # where are we access logging.INFO we will use the config of the filepath and format 
    # for the message that will be printed   
)
'''
if __name__=="__main__":
    logging.info("logging has started")
'''