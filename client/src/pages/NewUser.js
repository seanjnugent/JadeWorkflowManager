import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Shield, Check, X } from 'lucide-react';

const NewUser = () => {
  const navigate = useNavigate();
  const [newUser, setNewUser] = useState({
    first_name: '',
    surname: '',
    email: '',
    role: 'user',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: newUser.first_name,
          surname: newUser.surname,
          email: newUser.email,
          role: newUser.role,
          password: newUser.password
        }),
      });

      if (response.ok) {
        navigate('/users');
      } else {
        setError('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('An error occurred while creating the user.');
    }
  };

  return (
    <div className="ds_wrapper">
      <main id="main-content" className="ds_layout ds_layout--question">
        <div className="ds_layout__header">
          <header className="ds_page-header">
            <h1 className="ds_page-header__title">Create New User</h1>
          </header>
        </div>
        <div className="ds_layout__content">
          <form onSubmit={handleSubmit}>
            <div className="ds_form-group">
              <label className="ds_label" htmlFor="first_name">First Name</label>
              <input
                className="ds_input ds_input--fluid-three-quarters"
                type="text"
                id="first_name"
                name="first_name"
                value={newUser.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="ds_form-group">
              <label className="ds_label" htmlFor="surname">Last Name</label>
              <input
                className="ds_input ds_input--fluid-three-quarters"
                type="text"
                id="surname"
                name="surname"
                value={newUser.surname}
                onChange={handleChange}
                required
              />
            </div>
            <div className="ds_form-group">
              <label className="ds_label" htmlFor="email">Email</label>
              <input
                className="ds_input ds_input--fluid-three-quarters"
                type="email"
                id="email"
                name="email"
                value={newUser.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="ds_form-group">
              <label className="ds_label" htmlFor="role">Role</label>
              <select
                className="ds_input ds_input--fluid-three-quarters"
                id="role"
                name="role"
                value={newUser.role}
                onChange={handleChange}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="ds_form-group">
              <label className="ds_label" htmlFor="password">Password</label>
              <input
                className="ds_input ds_input--fluid-three-quarters"
                type="password"
                id="password"
                name="password"
                value={newUser.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="ds_form-group">
              <label className="ds_label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                className="ds_input ds_input--fluid-three-quarters"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={newUser.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            {error && <p className="ds_notification ds_notification--error">{error}</p>}
            <div className="ds_button-group">
              <button type="button" className="ds_button ds_button--secondary" onClick={() => navigate('/users')}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
              <button type="submit" className="ds_button">
                <Check className="w-4 h-4 mr-1" />
                Create User
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewUser;
