FROM node:wheezy

# Clone project
RUN git clone https://github.com/mathiaslm89/BlinkBoard.git /usr/BlinkBoard/
COPY /.env /usr/BlinkBoard/.env

# Set working directory
WORKDIR /usr/BlinkBoard

# Hack to allow bower to install dependencies inside docker (requires root permissions)
RUN chown -R root /usr/BlinkBoard
RUN npm install -g bower
RUN bower --allow-root install

# Install dependencies
RUN npm install

# Prepare app
EXPOSE 7331
CMD [ "npm", "start" ]

# How to run
RUN echo 'run e.g. [docker run -d -p 7331:7331 a2f0588ed891]'
