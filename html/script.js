const refreshMeals = () => {
    fetch('/api/meals')
      .then(res => res.json())
      .then(meals => {
        const list = document.getElementById('mealList');
        list.innerHTML = '';
        meals.forEach(meal => {
          const li = document.createElement('li');
          li.textContent = `${meal.type}: ${meal.name}`;
          list.appendChild(li);
        });
      });
  };
  
  refreshMeals();
  
  document.getElementById('addMeal').addEventListener('click', () => {
    const name = document.getElementById('mealInput').value;
    const type = document.getElementById('mealSelect').value;
  
    fetch('/api/meals', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa('author:password'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, type })
    }).then(refreshMeals);
  });