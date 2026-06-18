import os
from app import create_app

app = create_app(os.environ.get('FLASK_ENV', 'development'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # SECURITY: Never force debug=True — use config value (False in production)
    app.run(host='0.0.0.0', port=port, debug=app.config.get('DEBUG', False))
