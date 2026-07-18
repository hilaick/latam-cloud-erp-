#!/bin/bash
# Install migration tools on mig_worker

set -e

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing Redis tools..."
sudo apt install -y redis-tools

echo "Installing Memcached tools..."
sudo apt install -y libmemcached-tools netcat-openbsd

echo "Installing RedisShake..."
wget https://github.com/alibaba/RedisShake/releases/download/v3.1.7/redis-shake-linux-amd64.tar.gz
tar -xzf redis-shake-linux-amd64.tar.gz
chmod +x redis-shake
sudo mv redis-shake /usr/local/bin/

echo "Installing monitoring tools..."
sudo apt install -y htop iotop iftop nload

echo "Installing Python and pip..."
sudo apt install -y python3 python3-pip python3-venv

echo "Creating migration directory..."
mkdir -p ~/migration
cd ~/migration

echo "Creating Redis test script..."
cat > test_redis.sh << 'REDIS_EOF'
#!/bin/bash
REDIS_HOST="$1"
REDIS_PORT="${2:-6379}"

echo "Testing Redis connection to $REDIS_HOST:$REDIS_PORT..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING
if [ $? -eq 0 ]; then
    echo "✅ Redis connection successful"
    echo "Getting Redis info..."
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO | head -50
else
    echo "❌ Redis connection failed"
fi
REDIS_EOF
chmod +x test_redis.sh

echo "Creating Memcached test script..."
cat > test_memcached.sh << 'MEMCACHED_EOF'
#!/bin/bash
MEMCACHED_HOST="$1"
MEMCACHED_PORT="${2:-11211}"

echo "Testing Memcached connection to $MEMCACHED_HOST:$MEMCACHED_PORT..."
echo "stats" | nc "$MEMCACHED_HOST" "$MEMCACHED_PORT" | head -20
if [ $? -eq 0 ]; then
    echo "✅ Memcached connection successful"
else
    echo "❌ Memcached connection failed"
fi
MEMCACHED_EOF
chmod +x test_memcached.sh

echo "Creating migration configuration..."
cat > redis_shake.conf << 'CONFIG_EOF'
# RedisShake configuration for ULEARNING migration
source.type = "standalone"
source.address = "REDIS_SOURCE_IP:6379"
source.password_raw = ""

target.type = "standalone"
target.address = "REDIS_TARGET_IP:6379"
target.password_raw = ""

# Performance tuning
parallel = 32
psync = true
# ... rest of config
CONFIG_EOF

echo "✅ Migration tools installed successfully!"
echo ""
echo "Usage:"
echo "  Test Redis: ./test_redis.sh <redis_ip> <port>"
echo "  Test Memcached: ./test_memcached.sh <memcached_ip> <port>"
echo "  Start RedisShake: ./redis-shake -conf=redis_shake.conf"
