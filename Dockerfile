# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variable for port
ENV PORT=3030

# Expose port 3030
EXPOSE 3030

# Command to run the application
CMD [ "node", "server.js" ]
