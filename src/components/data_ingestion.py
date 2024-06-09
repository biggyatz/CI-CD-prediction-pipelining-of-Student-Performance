import os
import sys
from src.exception import CustomException
from src.logger import logging
import pandas as pd
from sklearn.model_selection import train_test_split
from dataclasses import dataclass
from src.components.data_transformation import DataTransformation
from src.components.data_transformation import DataTransformationConfig
from src.components.model_trainer import ModelTrainerConfig
from src.components.model_trainer import ModelTrainer


@dataclass
class DataIngestionConfig:
    train_data_path: str =os.path.join('artifacts',"train.csv") # this is the output path of the data ingestion model
    test_data_path: str =os.path.join('artifacts',"test.csv")
    raw_data_path: str =os.path.join('artifacts',"data.csv")

# now we create the actual data ingestion that knows the inputs already from the 
# DataIngestionConfig file path
class DataIngestion:
    # step 1 is to call for the inputs saved in the DIC config file artifacts
    def __init__(self):
        self.ingestion_config=DataIngestionConfig()
    def initiate_data_ingestion(self):
        # if the database is stored in some databases to read from mongodb client we need
        # to write in the utils.py
        logging.info("Entered the data ingestion method or component")
        try:
            # just change the import to the user specific data source mongo or other sources 
            df=pd.read_csv("notebook\data\stud.csv")
            logging.info("Data import sucessful")

            os.makedirs(os.path.dirname(self.ingestion_config.train_data_path),exist_ok=True)
            df.to_csv(self.ingestion_config.raw_data_path,index=False,header=True)
            logging.info("Train test split initiated")
            train_set,test_set=train_test_split(df,test_size=0.2,random_state=42)
            train_set.to_csv(self.ingestion_config.train_data_path,index=False,header=True)
            test_set.to_csv(self.ingestion_config.test_data_path,index=False,header=True)
            logging.info("Ingestion of the data is completed")
            return(
                self.ingestion_config.train_data_path,
                self.ingestion_config.test_data_path
            )# we pass these two informations as this will be the input for the next model 
            # data transformation take the info from them and start their respective process

        except Exception as e:
            raise CustomException(e,sys)

if __name__=="__main__":
    obj=DataIngestion()
    train_data,test_data=obj.initiate_data_ingestion()
    
    Data_transformation=DataTransformation()
    train_arr,test_arr,_=Data_transformation.initiate_data_transformation(train_data,test_data)

    ModelTrainer=ModelTrainer()
    print(ModelTrainer.initiate_model_trainer(train_arr,test_arr))
    
   