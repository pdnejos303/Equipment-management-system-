#!/bin/bash
set -e
echo '--- Installing Docker ---'
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
fi

echo '--- Extracting files ---'
mkdir -p ~/app
tar -xf ~/project.tar -C ~/app
cd ~/app

echo '--- Updating .env ---'
if [ -f .env ]; then
    sed -i 's|http://localhost:3000|http://43.211.59.105|g' .env
fi

echo '--- Starting Docker Compose ---'
sudo docker compose down
sudo docker compose up -d --build
