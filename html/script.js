const prod = false;
const path = prod ? 'https://abesdomainexpansion.com.mooo.com/api/' : 'http://localhost:3000/';


let authHeader = '';

// Login function
const login = () => {
  const username = prompt('Enter Username:');
  const password = prompt('Enter Password:');
  authHeader = 'Basic ' + btoa(`${username}:${password}`);
  fetchMeals();
};

document.getElementById('login-btn').addEventListener('click', login);

// Fetch meals (unauthenticated GET request)
const fetchMeals = () => {
  fetch('/api/meals')
    .then(res => res.json())
    .then(renderMeals)
    .catch(err => alert('Error loading meals: ' + err));
};

// Add meal (authenticated POST request)
const addMeal = () => {
  const name = document.getElementById('meal-name').value;
  const type = document.getElementById('meal-type').value;
  fetch('/api/meals', {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type })
  })
    .then(fetchMeals)
    .catch(err => alert('Error adding meal: ' + err));
};

document.getElementById('add-meal').addEventListener('click', addMeal);

// Update meal (authenticated PUT request)
const updateMeal = (id) => {
  const newName = prompt('Enter new meal name:');
  const newType = prompt('Enter new meal type:');
  fetch(`/api/meals?uid=${id}`, {
    method: 'PUT',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName, type: newType })
  })
    .then(fetchMeals)
    .catch(err => alert('Error updating meal: ' + err));
};

// Delete meal (authenticated DELETE request)
const deleteMeal = (id) => {
  if (!confirm('Are you sure you want to delete this meal?')) return;
  fetch(`/api/meals?uid=${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': authHeader }
  })
    .then(fetchMeals)
    .catch(err => alert('Error deleting meal: ' + err));
};

// Render meals in the DOM
const renderMeals = (meals) => {
  const container = document.getElementById('meals-container');
  container.innerHTML = '';
  meals.forEach(meal => {
    const mealDiv = document.createElement('div');
    mealDiv.className = 'meal';
    mealDiv.innerHTML = `
      ${meal.name} (${meal.type})
      <button onclick="updateMeal('${meal.uid}')">Update</button>
      <button onclick="deleteMeal('${meal.uid}')">Delete</button>
    `;
    container.appendChild(mealDiv);
  });
};

// Initial load
fetchMeals();
