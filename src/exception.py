# importing sys library contains the exception 
import sys
from src.logger import logging
def error_message_detail(error,error_detail:sys):
    # undertand the return type of sys and focus on the one that is the main focus
    _,_,exc_tb=error_detail.exc_info()
    file_name=exc_tb.tb_frame.f_code.co_filename
    error_message="Error occured in the python script name[{0}] line number [{1}] error message [{2}]".format(
        file_name,exc_tb.tb_lineno,str(error))
    return error_message

class CustomException(Exception):
    def __init__(self,error_message,error_detail:sys):
        super().__init__(error_message)
        self.error_message=error_message_detail(error_message,error_detail=error_detail)
    def __str__(self):
        return self.error_message
        # this will be common for the entire project when u use the try catch and raise 
        # custom exceptions 
''' generic test case for intial dry run
if __name__=="__main__":
    try:
        a=1/0
    except Exception as e:
        logging.info("error has occured")
        raise CustomException(e,sys)
'''