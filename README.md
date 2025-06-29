# Foundly - Student Organization Management Platform

Foundly is a comprehensive web application designed to help student organizations manage their projects, track volunteer hours, coordinate team members, and measure their impact. Built with React and Node.js, it provides a modern, intuitive interface for collaborative project management.

## 🚀 Features

### Core Functionality
- **Project Management**: Create, assign, and track projects with progress monitoring
- **Volunteer Hour Tracking**: Log and monitor volunteer hours with detailed descriptions
- **Team Collaboration**: Assign team members to projects with visual member selection
- **Real-time Analytics**: Comprehensive dashboard with performance trends and impact metrics
- **Announcements**: Admin-controlled announcements system with read tracking
- **Calendar Integration**: Event scheduling and management with persistent storage
- **Messaging System**: Real-time communication between team members

### Admin Features
- **Organization Management**: Create and manage organizations with join codes
- **Member Management**: Invite and manage team members
- **Analytics Dashboard**: Detailed insights into organization performance
- **Announcement Creation**: Post important updates to the team

### User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Real-time Updates**: Live data synchronization across all users
- **Performance Tracking**: Visual progress indicators and impact scoring

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **CSS3**: Custom styling with modern design patterns
- **Lucide React**: Beautiful, customizable icons
- **React Hot Toast**: Elegant notifications
- **Socket.io Client**: Real-time communication

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Socket.io**: Real-time bidirectional communication
- **JWT**: Secure authentication and authorization
- **Rate Limiting**: API protection and security

### Deployment
- **Vercel**: Frontend deployment platform
- **MongoDB Atlas**: Cloud database hosting
- **Git**: Version control and collaboration

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB database (local or cloud)

### Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

Start the backend server:
```bash
npm start
```

### Frontend Setup
```bash
npm install
```

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Deploy to your preferred Node.js hosting service
3. Update the frontend API configuration to point to your backend URL

### Frontend Deployment
1. Build the production version:
   ```bash
   npm run build
   ```
2. Deploy the `build` folder to Vercel or your preferred hosting service

## 📊 Key Metrics & Analytics

### Impact Score Calculation
The platform calculates an impact score based on:
- **Volunteer Hours**: 2 points per hour
- **Projects Completed**: 10 points per project
- **Team Members**: 5 points per active member

### Performance Trends
- **Hours Logged**: Track volunteer hours over time
- **Projects Active**: Monitor project completion rates
- **Team Growth**: Measure member recruitment and retention
- **Impact Growth**: Overall organization impact trends

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

### API Endpoints
- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User authentication
- `GET /api/organizations`: Get user organizations
- `POST /api/organizations`: Create new organization
- `GET /api/projects`: Get organization projects
- `POST /api/projects`: Create new project
- `PUT /api/projects/:id`: Update project
- `GET /api/analytics`: Get analytics data
- `POST /api/hours`: Log volunteer hours

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built as a student project for learning and demonstration purposes
- Inspired by the need for better organization management tools
- Special thanks to the React and Node.js communities for excellent documentation and tools

## 📞 Support

For support or questions about Foundly, please contact the development team or create an issue in the repository.

---

**Note**: This is a student project built for educational purposes. While functional and feature-complete, it should be used in appropriate contexts and may require additional security measures for production use. 