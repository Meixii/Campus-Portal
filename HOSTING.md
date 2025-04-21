# Campus Portal Hosting Guide

This guide provides instructions for hosting the Campus Portal on an Ubuntu Server within VirtualBox and making it accessible through a Raspberry Pi 3 hotspot.

## Prerequisites
- VirtualBox with Ubuntu Server 64-bit installed
- Raspberry Pi 3 Model B with 32-bit OS installed
- Basic knowledge of Linux commands and networking

## Part 1: Setting Up the Campus Portal on Ubuntu Server

### 1. Install Required Software
```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
sudo apt install -y nodejs npm

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### 2. Clone and Setup the Application
```bash
# Create directory for the application
mkdir -p /var/www/campusportal
cd /var/www/campusportal

# Clone or copy the application files here
# If using Git:
# git clone [repository-url] .

# Or manually copy files to this directory
# Then install dependencies
npm install
```

### 3. Configure Nginx

Create an Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/campusportal
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name campusportal.local;
    
    root /var/www/campusportal;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Create a symbolic link and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/campusportal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Start the Node.js Application
```bash
# Start the Node.js application
cd /var/www/campusportal
npm start

# To keep the application running after closing terminal, use:
nohup npm start > app.log 2>&1 &

# For production environments, consider using PM2:
sudo npm install -g pm2
pm2 start server.js --name campusportal
pm2 startup
pm2 save
```

## Part 2: Configuring Raspberry Pi 3 as a Hotspot

### 1. Setup Raspberry Pi 3 Hotspot
```bash
# Install required packages
sudo apt update
sudo apt install -y hostapd dnsmasq

# Stop services before configuration
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
```

### 2. Configure Static IP
Edit the dhcpcd configuration:
```bash
sudo nano /etc/dhcpcd.conf
```

Add the following at the end:
```
interface wlan0
static ip_address=192.168.4.1/24
nohook wpa_supplicant
```

### 3. Configure DHCP Server
Backup the original configuration:
```bash
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig
```

Create a new configuration:
```bash
sudo nano /etc/dnsmasq.conf
```

Add the following:
```
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
domain=local
address=/campusportal.local/192.168.4.1
```

### 4. Configure the Access Point
Create hostapd configuration:
```bash
sudo nano /etc/hostapd/hostapd.conf
```

Add the following:
```
interface=wlan0
driver=nl80211
ssid=CampusPortalWiFi
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=yourpassword
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

Set the configuration path:
```bash
sudo nano /etc/default/hostapd
```

Find and change the line to:
```
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

### 5. Enable IP Forwarding
```bash
sudo nano /etc/sysctl.conf
```

Uncomment the following line:
```
net.ipv4.ip_forward=1
```

Apply the changes:
```bash
sudo sysctl -p
```

### 6. Setup NAT
```bash
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT

# Make iptables rules persistent
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 7. Start Services
```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq
```

## Part 3: Port Forwarding from VirtualBox to Raspberry Pi

### 1. Find the IP Address of Ubuntu Server VM
In the Ubuntu Server VM, run:
```bash
ip addr show
```
Note the IP address (likely starting with 10.0.2.x or 192.168.x.x).

### 2. Setup Port Forwarding on Raspberry Pi
Add port forwarding rules on Raspberry Pi:
```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination [UBUNTU_VM_IP]:80
sudo netfilter-persistent save
```

### 3. Configure VirtualBox Network Settings
1. Shut down the Ubuntu VM
2. In VirtualBox Manager, right-click the VM and select "Settings"
3. Go to "Network" tab
4. Make sure "Adapter 1" is enabled and set to "NAT" or "Bridged Adapter"
5. If using NAT, click "Advanced" and then "Port Forwarding"
6. Add a rule: Protocol TCP, Host IP (leave blank), Host Port 80, Guest IP (leave blank), Guest Port 80
7. Start the VM again

## Part 4: Testing and Troubleshooting

### 1. Test the Setup
1. Connect a device to your "CampusPortalWiFi" network
2. Open a browser and navigate to http://campusportal.local
3. You should see the Campus Portal login page

### 2. Troubleshooting
- If the page doesn't load, check if the Nginx service is running on Ubuntu Server
- Verify port forwarding rules are correctly set up on Raspberry Pi
- Check the Raspberry Pi hotspot is properly configured
- Use `ping campusportal.local` to test name resolution
- Check firewall settings on both Ubuntu Server and Raspberry Pi

### 3. Security Considerations
- Change default passwords for both Ubuntu Server and Raspberry Pi
- Consider setting up HTTPS for secure connections
- Regularly update all systems with security patches

## Maintenance

### Ubuntu Server
```bash
# Update the system
sudo apt update
sudo apt upgrade -y

# Check Nginx status
sudo systemctl status nginx

# View application logs
tail -f /var/www/campusportal/app.log
```

### Raspberry Pi
```bash
# View hostapd logs
sudo journalctl -u hostapd

# Check connected devices
sudo arp -a

# Restart hotspot if needed
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq
```
