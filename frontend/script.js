document.addEventListener('DOMContentLoaded', function () {
    const scheduleTableBody = document.getElementById('scheduleTableBody');
    const addScheduleBtn = document.getElementById('addScheduleBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const noLectureAlert = document.getElementById('noLectureAlert');
    const currentDayElement = document.getElementById('currentDay');
    const viewTabs = document.querySelectorAll('.view-tab');

    const scheduleModal = document.getElementById('scheduleModal');
    const modalTitle = document.getElementById('modalTitle');
    const scheduleForm = document.getElementById('scheduleForm');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelBtn');
    const scheduleIdInput = document.getElementById('scheduleId');

    let currentView = 'course';
    let currentDay = 'Wednesday';

    init();

    function init() {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        currentDay = daysOfWeek[today.getDay()];
        currentDayElement.textContent = currentDay;

        loadSchedules();
        setupEventListeners();
    }

    function setupEventListeners() {
        viewTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                viewTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentView = this.dataset.view;
                loadSchedules();
            });
        });

        addScheduleBtn.addEventListener('click', () => openModal('add'));
        downloadPdfBtn.addEventListener('click', downloadPDF);

        refreshBtn.addEventListener('click', function () {
            this.classList.add('fa-spin');
            loadSchedules().then(() => {
                setTimeout(() => {
                    refreshBtn.classList.remove('fa-spin');
                }, 500);
            });
        });

        closeModal.addEventListener('click', () => scheduleModal.style.display = 'none');
        cancelBtn.addEventListener('click', () => scheduleModal.style.display = 'none');

        window.addEventListener('click', function (event) {
            if (event.target === scheduleModal) {
                scheduleModal.style.display = 'none';
            }
        });

        scheduleForm.addEventListener('submit', function (e) {
            e.preventDefault();
            saveSchedule();
        });
    }

    async function loadSchedules() {
        try {
            scheduleTableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="loading"></div></td></tr>';

            let queryParams = '';
            if (currentView === 'daily') {
                queryParams = `?day=${currentDay}`;
            }

            const response = await fetch(`/api/schedules${queryParams}`);
            const data = await response.json();

            if (data.length === 0) {
                noLectureAlert.style.display = 'block';
                scheduleTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No classes scheduled</td></tr>';
            } else {
                noLectureAlert.style.display = 'none';
                renderScheduleTable(data);
            }

            return data;
        } catch (error) {
            console.error('Error loading schedules:', error);
            scheduleTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading schedules. Please try again.</td></tr>';
        }
    }

    function renderScheduleTable(schedules) {
        scheduleTableBody.innerHTML = '';

        if (currentView === 'weekly') {
            const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const schedulesByDay = {};

            daysOrder.forEach(day => {
                const daySchedules = schedules.filter(schedule => schedule.dayOfWeek === day);
                if (daySchedules.length > 0) {
                    schedulesByDay[day] = daySchedules;
                }
            });

            Object.entries(schedulesByDay).forEach(([day, daySchedules]) => {
                const dayRow = document.createElement('tr');
                dayRow.className = 'day-row';
                dayRow.innerHTML = `<td colspan="7" class="day-title">${day}</td>`;
                scheduleTableBody.appendChild(dayRow);

                daySchedules.forEach(schedule => {
                    appendScheduleRow(schedule);
                });
            });
        } else {
            schedules.forEach(schedule => {
                appendScheduleRow(schedule);
            });
        }
    }

    function appendScheduleRow(schedule) {
        const row = document.createElement('tr');
        const timeDisplay = `${schedule.startTime} - ${schedule.endTime}`;

        row.innerHTML = `
            <td>${schedule.lectureRoom}</td>
            <td>${timeDisplay}</td>
            <td>${schedule.academicYear}</td>
            <td>${schedule.program}</td>
            <td>${schedule.courseCode}</td>
            <td>${schedule.lecturer}</td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" data-id="${schedule._id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${schedule._id}" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

        row.querySelector('.edit-btn').addEventListener('click', () => openModal('edit', schedule._id));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteSchedule(schedule._id));
        scheduleTableBody.appendChild(row);
    }

    async function openModal(mode, scheduleId = null) {
        scheduleForm.reset();
        scheduleIdInput.value = '';

        if (mode === 'add') {
            modalTitle.textContent = 'Add New Schedule';
            document.getElementById('dayOfWeek').value = currentDay;
        } else {
            modalTitle.textContent = 'Edit Schedule Entry';
            try {
                const response = await fetch(`/api/schedules/${scheduleId}`);
                const schedule = await response.json();

                scheduleIdInput.value = schedule._id;
                document.getElementById('dayOfWeek').value = schedule.dayOfWeek;
                document.getElementById('lectureRoom').value = schedule.lectureRoom;
                document.getElementById('startTime').value = schedule.startTime;
                document.getElementById('endTime').value = schedule.endTime;
                document.getElementById('academicYear').value = schedule.academicYear;
                document.getElementById('program').value = schedule.program;
                document.getElementById('courseCode').value = schedule.courseCode;
                document.getElementById('lecturer').value = schedule.lecturer;
            } catch (error) {
                console.error('Error fetching schedule:', error);
                alert('Could not load schedule details. Please try again.');
                return;
            }
        }

        scheduleModal.style.display = 'block';
    }

    async function saveSchedule() {
        try {
            const scheduleId = scheduleIdInput.value;
            const isEdit = !!scheduleId;

            const formData = {
                dayOfWeek: document.getElementById('dayOfWeek').value,
                lectureRoom: document.getElementById('lectureRoom').value,
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value,
                academicYear: document.getElementById('academicYear').value,
                program: document.getElementById('program').value,
                courseCode: document.getElementById('courseCode').value,
                lecturer: document.getElementById('lecturer').value
            };

            const url = isEdit ? `/api/schedules/${scheduleId}` : '/api/schedules';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save schedule');

            scheduleModal.style.display = 'none';
            loadSchedules();
            alert(isEdit ? 'Schedule updated successfully!' : 'Schedule added successfully!');
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('An error occurred while saving the schedule. Please try again.');
        }
    }

    async function deleteSchedule(scheduleId) {
        if (!confirm('Are you sure you want to delete this schedule?')) return;

        try {
            const response = await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete schedule');

            loadSchedules();
            alert('Schedule deleted successfully!');
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('An error occurred while deleting the schedule. Please try again.');
        }
    }

    function downloadPDF() {
        alert('Generating PDF. This feature would connect to a server-side PDF generation service.');
    }
});
