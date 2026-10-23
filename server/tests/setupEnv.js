process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-secret-32chars-min';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/marketmind-test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.BCRYPT_ROUNDS = '4';
process.env.PORT = '5000';
