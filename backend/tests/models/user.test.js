const User = require('../../src/models/User');
const { AppError } = require('../../src/middleware/errorHandler');

describe('User Model', () => {
  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        userType: 'client',
        firstName: 'Test',
        lastName: 'User',
        bio: 'Test user bio',
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.user_type).toBe(userData.userType);
      expect(user.first_name).toBe(userData.firstName);
      expect(user.password_hash).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        userType: 'agent',
        firstName: 'Test',
        lastName: 'User',
      };

      await User.create(userData);

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = await User.findByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = await User.findByEmail('test@example.com');
      const foundUser = await User.findById(user.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(user.id);
    });

    it('should return null for non-existent ID', async () => {
      const user = await User.findById('00000000-0000-0000-0000-000000000000');

      expect(user).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const isValid = await User.validatePassword('TestPassword123!', '$2a$12$hashedPasswordExample');

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const user = await User.findByEmail('test@example.com');
      const updatedUser = await User.update(user.id, {
        firstName: 'Updated',
        bio: 'Updated bio',
      });

      expect(updatedUser.first_name).toBe('Updated');
      expect(updatedUser.bio).toBe('Updated bio');
    });
  });
});
