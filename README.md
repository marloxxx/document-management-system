# Document Management System

A comprehensive document management system built with Laravel (PHP) and React (TypeScript) for handling translation documents with registration numbers and bidirectional support.

## 🚀 Features

### Core Features
- **Document Management**: Create, edit, view, and manage translation documents
- **Registration System**: Automatic registration number generation with Roman numeral months
- **Bidirectional Translation**: Support for Indo-Mandarin, Mandarin-Indo, Indo-Taiwan, and Taiwan-Indo translations
- **User Management**: Role-based access control (Admin, Client)
- **Activity Logging**: Comprehensive audit trail for all document operations
- **File Upload**: Evidence file support with validation
- **Draft System**: Save documents as drafts before submission

### Advanced Features
- **Smart Registration States**: ISSUED, PARTIAL, COMMITTED states for re gistration management
- **Duplicate Prevention**: Server-side validation to prevent duplicate directions on same registration
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Dynamic data tables with server-side processing
- **Date Picker**: Modern date selection component
- **Status Management**: Document status tracking (DRAFT, SUBMITTED)

## 🛠️ Tech Stack

### Backend
- **Laravel 11**: PHP framework
- **MySQL**: Database
- **Yajra DataTables**: Server-side data processing
- **Spatie Activity Log**: Activity logging
- **Laravel Sanctum**: API authentication

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Inertia.js**: SPA framework
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **React DayPicker**: Date picker
- **date-fns**: Date utilities

## 📋 Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL 8.0+
- NPM/Yarn

## 🚀 Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/marloxxx/document-management-system.git
cd document-management-system
```

For production on a VPS with Docker and Traefik, see **[docs/DEPLOY-VPS.md](docs/DEPLOY-VPS.md)**.

### 2. Install Dependencies
```bash
# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install
```

### 3. Environment Configuration
```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### 4. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE document_management_system;

# Update .env file with database credentials
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=document_management_system
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 5. Run Migrations & Seeders
```bash
# Run migrations
php artisan migrate

# Run seeders
php artisan db:seed
```

### 6. Build Frontend Assets
```bash
# Development build
npm run dev

# Production build
npm run build
```

### 7. Start Development Server
```bash
# Start Laravel server
php artisan serve

# In another terminal, start Vite dev server
npm run dev
```

## 🗄️ Database Schema

### Core Tables
- **users**: User management with roles
- **registrations**: Registration number management
- **documents**: Document storage with bidirectional support
- **document_types**: Document type definitions
- **number_counters**: Sequence number tracking
- **activity_log**: Audit trail

### Key Relationships
- Users can have multiple registrations
- Registrations can have multiple documents (bidirectional)
- Documents belong to users and registrations
- Activity log tracks all changes

## 🔧 Configuration

### Registration Number Format
- Format: `{seq}/{roman_month}/{year}`
- Example: `01/X/2025` (October 2025)
- Roman numerals: I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII

### Direction Mapping
- **Indo-Mandarin**: Indonesian to Mandarin
- **Mandarin-Indo**: Mandarin to Indonesian
- **Indo-Taiwan**: Indonesian to Taiwanese
- **Taiwan-Indo**: Taiwanese to Indonesian

### Registration States
- **ISSUED**: 0 documents - Available for any direction
- **PARTIAL**: 1 document - Available for opposite direction only
- **COMMITTED**: 2+ documents - No longer available

## 🚀 Deployment

### Production Build
```bash
# Install production dependencies
composer install --optimize-autoloader --no-dev

# Build frontend for production
npm run build

# Optimize Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Web Server Configuration

#### Apache (.htaccess)
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/document-management-system/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### Environment Variables
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_PORT=3306
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
```

## 📱 Usage

### User Roles
- **Admin**: Full access to all documents and users
- **Client**: Can create and manage their own documents

### Document Workflow
1. **Create Registration**: Issue a new registration number
2. **Create Document**: Add document with registration number
3. **Bidirectional Support**: Use same registration for opposite direction
4. **Status Management**: Save as draft or submit directly
5. **File Upload**: Attach evidence files
6. **Activity Tracking**: All changes are logged

### Key Features Usage
- **Registration Numbers**: Automatically generated with Roman numeral months
- **Direction Validation**: Prevents duplicate directions on same registration
- **Draft System**: Save incomplete documents for later completion
- **Activity Log**: Track all document changes and user actions

## 🔌 API Endpoints

### Registration Endpoints
- `GET /registrations` - List all registrations
- `POST /registrations/issue` - Issue new registration number
- `GET /registrations/{id}` - Get specific registration

### Document Endpoints
- `GET /documents` - List all documents
- `POST /documents` - Create new document
- `GET /documents/{id}` - Get specific document
- `PUT /documents/{id}` - Update document
- `DELETE /documents/{id}` - Delete document

### User Endpoints
- `GET /users` - List all users (Admin only)
- `POST /users` - Create new user (Admin only)
- `GET /users/{id}` - Get specific user
- `PUT /users/{id}` - Update user

## 📝 Example Usage

### Creating a Document
```javascript
// Frontend (React)
const formData = {
  registration_number: '01/X/2025',
  direction: 'Indo-Mandarin',
  document_type_id: 1,
  page_count: 5,
  title: 'Contract Agreement',
  notes: 'Initial contract',
  user_identity: 'John Doe - ID: 12345',
  issued_date: '2025-10-06',
  is_draft: false
};

const response = await fetch('/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': csrfToken
  },
  body: JSON.stringify(formData)
});
```

### Backend Validation
```php
// Laravel Controller
public function store(Request $request)
{
    $data = $request->validate([
        'registration_number' => 'required|exists:registrations,number',
        'direction' => 'required|in:Indo-Mandarin,Mandarin-Indo,Indo-Taiwan,Taiwan-Indo',
        'page_count' => 'required|integer|min:1',
        'title' => 'nullable|string|max:255',
        'is_draft' => 'nullable|boolean'
    ]);

    // Server-side validation for duplicate directions
    $reg = Registration::where('number', $data['registration_number'])->first();
    $exists = $reg->documents()->where('direction', $data['direction'])->exists();
    
    if ($exists) {
        throw ValidationException::withMessages([
            'direction' => 'Dokumen untuk arah ini pada nomor tersebut sudah ada.'
        ]);
    }
}
```

## 🔒 Security Features

- **CSRF Protection**: All forms protected against CSRF attacks
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: File type and size validation
- **Role-based Access**: Users can only access their own documents
- **SQL Injection Prevention**: Eloquent ORM with parameterized queries
- **XSS Protection**: Output escaping and validation

## 🧪 Testing

```bash
# Run PHP tests
php artisan test

# Run specific test
php artisan test --filter=DocumentTest

# Run with coverage
php artisan test --coverage
```

## 📊 Monitoring & Logs

### Log Files
- `storage/logs/laravel.log`: Application logs
- `storage/logs/activity.log`: Activity logs

### Monitoring
- Database query performance
- File upload monitoring
- User activity tracking
- Error logging and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 📁 Project Structure

```
document-management-system/
├── app/
│   ├── Http/Controllers/     # API controllers
│   ├── Models/               # Eloquent models
│   ├── Services/             # Business logic services
│   ├── Helpers/              # Helper classes
│   └── Policies/             # Authorization policies
├── database/
│   ├── migrations/           # Database migrations
│   └── seeders/             # Database seeders
├── resources/
│   ├── js/
│   │   ├── components/      # React components
│   │   ├── Pages/           # Page components
│   │   └── hooks/           # Custom React hooks
│   └── views/               # Blade templates
├── routes/
│   └── web.php              # Web routes
└── public/                   # Public assets
```

## 🔧 Development Commands

```bash
# Start development servers
php artisan serve
npm run dev

# Build for production
npm run build

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Database operations
php artisan migrate
php artisan migrate:rollback
php artisan db:seed
php artisan migrate:fresh --seed

# Generate files
php artisan make:controller ControllerName
php artisan make:model ModelName -m
php artisan make:migration migration_name
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
php artisan tinker
DB::connection()->getPdo();

# Reset database
php artisan migrate:fresh --seed
```

#### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
npm run dev -- --force
```

#### Permission Issues
```bash
# Set proper permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### Memory Issues
```bash
# Increase PHP memory limit
php -d memory_limit=512M artisan serve
```

### Error Logs
- Check `storage/logs/laravel.log` for PHP errors
- Check browser console for JavaScript errors
- Check web server error logs

## 📈 Performance Optimization

### Database Optimization
- Use database indexes for frequently queried columns
- Implement query caching for complex queries
- Use database connection pooling

### Frontend Optimization
- Use React.memo for expensive components
- Implement lazy loading for large datasets
- Optimize bundle size with code splitting

### Server Optimization
- Enable OPcache for PHP
- Use Redis for session and cache storage
- Implement CDN for static assets

## 🔄 Updates & Maintenance

### Regular Maintenance
- Update dependencies regularly
- Monitor log files
- Backup database regularly
- Update security patches

### Version Updates
- Follow semantic versioning
- Test thoroughly before production
- Update documentation
- Notify users of breaking changes

## 📚 Additional Resources

### Documentation
- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev/)
- [Inertia.js Documentation](https://inertiajs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Useful Commands
```bash
# Check application status
php artisan about

# Generate IDE helper files
php artisan ide-helper:generate

# Clear all caches
php artisan optimize:clear

# Check routes
php artisan route:list
```

## 📋 Changelog

### Version 1.0.0 (Current)
- ✅ Initial release with core document management features
- ✅ Registration number system with Roman numeral months
- ✅ Bidirectional translation support (Indo-Mandarin, Mandarin-Indo, Indo-Taiwan, Taiwan-Indo)
- ✅ User role management (Admin, Client)
- ✅ Activity logging and audit trail
- ✅ File upload with validation
- ✅ Draft system for incomplete documents
- ✅ Modern React UI with TypeScript
- ✅ Server-side validation for duplicate prevention
- ✅ Responsive design with Tailwind CSS
- ✅ Date picker component
- ✅ Real-time data tables

### Planned Features
- 🔄 Email notifications
- 🔄 Advanced search and filtering
- 🔄 Document versioning
- 🔄 API documentation with Swagger
- 🔄 Multi-language support
- 🔄 Advanced reporting and analytics

## 🏆 Acknowledgments

- **Laravel Team** for the amazing PHP framework
- **React Team** for the powerful UI library
- **Tailwind CSS** for the utility-first CSS framework
- **Inertia.js** for seamless SPA experience
- **Spatie** for excellent Laravel packages

---

**Built with ❤️ using Laravel and React**

*Last updated: October 2025*
