const prod = false;
const path = prod ? 'https://abesdomainexpansion.com.mooo.com/api/' : 'http://localhost:3000/';

let authHeader = '';

// Login function
const login = () => {
  const username = prompt('Enter Username:');
  const password = prompt('Enter Password:');
  authHeader = 'Basic ' + btoa(`${username}:${password}`);
  fetchMeals();
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'block';
  document.getElementById('adminPanelBtn').style.display = 'block';
};

// Logout function
const logout = () => {
  authHeader = '';
  document.getElementById('loginBtn').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('adminPanelBtn').style.display = 'none';
};

// Attach event listener for logout button
document.getElementById('logoutBtn').addEventListener('click', logout);

// Fetch meals (unauthenticated GET request)
const fetchMeals = () => {
  fetch(path + 'api/meals', {
    method: 'GET',
    headers: { 'Authorization': authHeader }
  })
    .then(res => res.json())
    .then(renderMeals)
    .catch(err => alert('Error loading meals: ' + err));
};

// Add meal (authenticated POST request)
const addMeal = (event) => {
  event.preventDefault(); // Prevent page refresh
  const name = document.getElementById('mealName').value;
  const type = document.getElementById('mealType').value;
  fetch(path + 'api/meals', {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type })
  })
    .then(fetchMeals)
    .catch(err => alert('Error adding meal: ' + err));
};

document.getElementById('mealForm').addEventListener('submit', addMeal);

// Update meal (authenticated PUT request)
const updateMeal = (id) => {
  const newName = prompt('Enter new meal name:');
  const newType = prompt('Enter new meal type:');
  fetch(path + `/api/meals?uid=${id}`, {
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
  fetch(path + `/api/meals?uid=${id}`, {
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