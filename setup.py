from setuptools import setup, find_packages

setup(
    name="conduit",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "pyspark",
        "pydantic",
        "sqlalchemy",
        "asyncpg",
        "motor",
        "python-multipart",
        "black",
    ],
    extras_require={"dev": ["pytest", "pytest-asyncio", "black", "flake8"]},
    entry_points={
        "console_scripts": [
            "runserver=main:app",
        ],
    },
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "Framework :: FastAPI",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
