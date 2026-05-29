# 📍 GeoSnapper - GPS Photo Mapping Application

A powerful web application that combines real-time GPS tracking with photo geotagging, allowing users to capture and pin photos exactly where they were taken.

## ✨ Features

### 🗺️ Real-time GPS Tracking
- High-accuracy GPS positioning (up to 10m precision)
- Live location updates with smooth animations
- Visual accuracy circle showing GPS confidence
- Signal strength indicator with real-time feedback

### 📸 Smart Photo Capture
- **PC**: Professional webcam interface with keyboard shortcuts
- **Mobile**: Direct native camera access with `capture` attribute
- Gallery upload fallback for all devices
- Automatic photo geotagging at current location

### 🎨 Professional UI
- Modern glassmorphism design
- Multiple map layers (Street, Satellite, Dark)
- Responsive layout for all screen sizes
- Smooth animations and transitions

### 📍 Location Features
- Reverse geocoding to get address names
- Photo markers with popup information
- Date, time, and GPS accuracy displayed with each photo
- Recenter button to focus on your location

## 🚀 Live Demo

[View Live Demo](https://your-demo-link.com)

## 💻 Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap
- **GPS**: Browser Geolocation API with high accuracy mode
- **Camera**: MediaDevices API (getUserMedia)
- **Geocoding**: Nominatim OpenStreetMap API
- **Icons**: Bootstrap Icons
- **Styling**: Custom CSS with glassmorphism effects

## 📋 Prerequisites

- Modern web browser with:
  - Geolocation support
  - MediaDevices API support (for camera)
  - HTTPS or localhost (required for geolocation)
- XAMPP or any local server (optional)

## 🛠️ Installation

### Local Setup with XAMPP

1. **Clone the repository**
```bash
git clone https://github.com/LeoJ0515/GeoSnapper.git
