
const refreshEntries = () => {
    fetch('/api')
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(entries => { /* Continue processing */ })
    .catch(error => console.error("Fetch error:", error));
    fetch('/api')
        .then(res => res.json())
        .then(entries => {
            const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
            document.getElementById('totalCalories').innerText = totalCalories;
            
            const list = document.getElementById('foodList');
            list.innerHTML = '';

            entries.forEach((entry, index) => {
                const li = document.createElement('li');
                li.textContent = `${entry.name} - ${entry.calories} cal`;

                // Update Button
                const updateBtn = document.createElement('button');
                updateBtn.textContent = 'Update';
                updateBtn.onclick = () => updateEntry(index);

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => deleteEntry(index);

                li.append(updateBtn, deleteBtn);
                list.appendChild(li);
            });
        });
};

// Load entries on page load
refreshEntries();

// Add food entry (POST request)
document.getElementById('addButton').addEventListener('click', () => {
    const foodSelect = document.getElementById('food');
    const name = foodSelect.value;
    const calories = parseInt(foodSelect.selectedOptions[0].dataset.calories, 10);

    fetch('/api', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, calories })
    })
    .then(response => response.json())
    .then(refreshEntries);
});

// Prevent dropdown click from triggering any unwanted events
document.getElementById('food').addEventListener('click', (ev) => ev.stopPropagation());

// Update an entry (PUT request)
const updateEntry = (index) => {
    const newCalories = prompt("Enter new calorie amount:");
    if (!newCalories || isNaN(newCalories)) return;

    fetch(`/api/${index}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calories: Number(newCalories) })
    })
    .then(response => response.json())
    .then(refreshEntries);
};

// Delete an entry (DELETE request)
const deleteEntry = (index) => {
    fetch(`/api/${index}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(refreshEntries)
        .catch(err => console.error("Delete error:", err));
};
