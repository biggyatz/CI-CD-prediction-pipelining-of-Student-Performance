# it is the activity building ,dising and installing modeules using the distutils package
from setuptools import find_packages,setup
from typing import List

# we create a function to return the list of reqquirements
# input params that returns the list 
# -e . is to enable the install of requirements directly connected to the setup.py
# but it should not be read while accessing the file below and omitted
HYPEN_E_DOT='-e .'
def get_requirements(filepath:str)->List[str]:
    requirements=[]
    with open(filepath) as file_obj:
        requirements=file_obj.readlines()
        requirements=[req.replace("\n","") for req in requirements]

        if HYPEN_E_DOT in requirements:
            requirements.remove(HYPEN_E_DOT)
    return requirements



setup(
    name="mlproject",
    version="0.0.1",
    author="Bigyat",
    packages=find_packages(),
    install_requires=get_requirements("requirements.txt")
)
