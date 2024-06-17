# CI/CD pipelines - github actions deployment method

1. Data Ingestion
2. Data Transformer
3. Modal trainer
4. Modal Evaluation
5. Model Deployment

# Day 1 - git config
1. Set up of github
2. New environement (venv)
3. Mini project structure of the 
4. setup.py file and requirements.txt
5. src folder 

# Day 2 - project structure, exception and loggers
1. Splitting the project into components of the project structure 
2. The data ingestion, transformation and other trainer evalution etc are like the seperate modules or components that are present into the ML project 
3. Creating the custom exception file and logger and registering the log into the logger for the first 

# Day 3 - EDA and model training 
1. Provide the observation to the client and we perform the EDA part in the jupyter notebook
2. Create the train test split and the evalute the models and compare the results
3. Be format ready to feed it to the data_ingestion.py and utils.py files

# Day 4 - data ingestion 
1. Create the file path and config class redirecting the output or the result into the artifacts folder 
2. Read the dataset from any sources
3. Conversion of the raw datapath to csv
4. Creating the train test split and creating its respective csv files after the split
5. Returning the train and test data paths for data transformation model to commence 

# day 5 - data transformation 
1. Due to the presence of categorical numerical and other features we need to transform the data
2. As per the data we perform the feature scaling , feature extraction and other Feature extraction techniques
3. We need to create a pipeline to impute form any missing values present in the data set and use of one hot encoder techniques and standard scaler for scaling the values

# day 6 - model training, evalutaion and hyper parameter tuning
we perform the trainng of the model through various machine learning models and algorithms to find the best fit model for the given problem statement and test for any parameters to tune our model and acheive better performance of the model trained

# day 7 - prediction pipeline and deployment into azure
we created all the pipeline to preprocess the data now we need the prediction model where the data is collected inorder to find the prediction with respect to the math score and deploy our model into the AWS cloud platform whose link is as follows

# LINK TO THE DEPLOYED MODEL - http://studentperformance-env-1.eba-ph2xqb5w.us-east-1.elasticbeanstalk.com/

