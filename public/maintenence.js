const link = "https://reaperclone.onrender.com/";
window.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch(link+"maintenancedata");
    if(response.ok){
        const data = await response.json();
        if (data.maintenance) {
            const start = new Date(data.start).toLocaleString();
            const end = new Date(data.end).toLocaleString();
            
            // Display the maintenance details on the page
            document.getElementById("maintenance-status").innerHTML = `
            Maintenance started at ${start} and ends at ${end}.
            `;
        }
    }
});
  