// admin.js

// --- Global State Variables ---
let currentProject = null; // Stores the currently selected project's ID and name
let loggedInUser = null; 
let allProjectMembers = []; // Cache of members for the current project
let allProjectTasks = []; // Cache of tasks for the current project
let ganttChart = null; // Instance of the Frappe Gantt chart

// --- Constants ---
const API_BASE_URL = '/api'; // Base URL for your API endpoints

// --- DOM Elements ---
const DOMElements = {
    // Layout and views
    inicioContainer: document.getElementById('inicio-container'),
    projectDashboard: document.getElementById('project-dashboard'),
    selectedProjectNameHeader: document.getElementById('selectedProjectNameHeader'),
    ownedProjectsList: document.getElementById('owned-projects'),
    memberProjectsList: document.getElementById('member-projects'),
    
    // User profile
    userProfileArea: document.getElementById('userProfileArea'),
    userNameDisplay: document.getElementById('userNameDisplay'),
    userEmailDisplay: document.getElementById('userEmailDisplay'),

    // Project creation
    addProjectBtn: document.getElementById('add-project-btn'),
    createProjectFromInicioBtn: document.getElementById('create-project-from-inicio'),
    projectModal: document.getElementById('project-modal'),
    createProjectForm: document.getElementById('createProjectForm'),
    cancelProjectBtn: document.getElementById('cancel-project'),
    projectNameInput: document.getElementById('project-name'),
    projectDescriptionInput: document.getElementById('project-description'),
    projectIniDateInput: document.getElementById('project-ini-date'),
    projectVenDateInput: document.getElementById('project-ven-date'),

    // Task management (List View)
    addTaskBtn: document.getElementById('add-task-btn'),
    tasksListItems: document.querySelector('.tasks-list-items'),
    filterStatusSelect: document.getElementById('filter-status'),
    filterPrioritySelect: document.getElementById('filter-priority'),
    applyFiltersBtn: document.getElementById('apply-filters-btn'),

    // Task management (Kanban View)
    addTaskKanbanBtn: document.getElementById('add-task-kanban-btn'),
    kanbanViewColumns: document.querySelector('.kanban-view-columns'),

    // Task management (Gantt View)
    ganttView: document.getElementById('gantt-view'),
    ganttChartContainer: document.getElementById('gantt-chart'),
    zoomInBtn: document.getElementById('zoom-in'),
    zoomOutBtn: document.getElementById('zoom-out'),
    fitViewBtn: document.getElementById('fit-view'),

    // Task modal
    taskModal: document.getElementById('task-modal'),
    cancelTaskBtn: document.getElementById('cancel-task'),
    saveTaskBtn: document.getElementById('save-task'),
    taskTitleInput: document.getElementById('task-title'),
    taskDescriptionInput: document.getElementById('task-description'),
    taskIniDateInput: document.getElementById('task-Ini-date'),
    taskLimDateInput: document.getElementById('task-lim-date'),
    taskPrioritySelect: document.getElementById('task-priority'),
    taskAssigneeSelect: document.getElementById('task-assignee'),
    taskDependenciesSelect: document.getElementById('task-dependencies'),

    // Task Detail Modal
    taskDetailModal: document.getElementById('task-detail-modal'),
    detailTaskTitle: document.getElementById('detail-task-title'),
    detailTaskDescription: document.getElementById('detail-task-description'),
    detailTaskIniDate: document.getElementById('detail-task-ini-date'),
    detailTaskLimDate: document.getElementById('detail-task-lim-date'),
    detailTaskPriority: document.getElementById('detail-task-priority'),
    detailTaskAssignedTo: document.getElementById('detail-task-assigned-to'),
    detailTaskStatus: document.getElementById('detail-task-status'),
    changeTaskStatusSelect: document.getElementById('change-task-status'),
    toggleStatusEditBtn: document.getElementById('toggle-status-edit'),
    markTaskCompleteCheckbox: document.getElementById('mark-task-complete'),
    taskCommentsList: document.getElementById('task-comments-list'),
    newCommentInput: document.getElementById('new-comment'),
    addCommentBtn: document.getElementById('add-comment-btn'),
    collaboratorsList: document.getElementById('collaborators-list'),
    subtasksList: document.getElementById('subtasks-list'),
    editTaskBtn: document.getElementById('edit-task-btn'),
    addSubtaskBtn: document.getElementById('add-subtask-btn'),
    deleteTaskBtn: document.getElementById('delete-task-btn'),
    closeTaskDetailBtn: document.getElementById('close-task-detail'),

    // Subtask Modal
    subtaskModal: document.getElementById('subtask-modal'),
    cancelSubtaskBtn: document.getElementById('cancel-subtask'),
    saveSubtaskBtn: document.getElementById('save-subtask'),
    subtaskTitleInput: document.getElementById('subtask-title'),
    subtaskDescriptionInput: document.getElementById('subtask-description'),
    subtaskIniDateInput: document.getElementById('subtask-ini-date'),
    subtaskLimDateInput: document.getElementById('subtask-lim-date'),
    subtaskPrioritySelect: document.getElementById('subtask-priority'),
    subtaskAssigneeSelect: document.getElementById('subtask-assignee'),

    // Invite modal
    inviteUsersBtn: document.getElementById('invite-users-btn'),
    inviteModal: document.getElementById('invite-modal'),
    closeInviteBtn: document.getElementById('close-invite'),
    inviteEmailInput: document.getElementById('invite-email'),
    inviteRoleSelect: document.getElementById('invite-role'),
    sendInviteEmailBtn: document.getElementById('send-invite-email'),

    // Profile editing
    editProfileModal: document.getElementById('edit-profile-modal'),
    editProfileForm: document.getElementById('editProfileForm'),
    cancelEditProfileBtn: document.getElementById('cancel-edit-profile'),
    editUsernameInput: document.getElementById('edit-username'),
    editUserLastnameInput: document.getElementById('edit-userlastname'),
    editUserEmailInput: document.getElementById('edit-useremail'),
    editPasswordInput: document.getElementById('edit-password'),

    // Confirmation modal
    confirmationModal: document.getElementById('confirmation-modal'),
    confirmationMessage: document.getElementById('confirmation-message'),
    cancelActionBtn: document.getElementById('cancel-action-btn'),
    confirmActionBtn: document.getElementById('confirm-action-btn'),

    // Notifications and loading
    notificationArea: document.getElementById('notificationArea'),
    loadingSpinner: document.getElementById('loadingSpinner'),

    // View options
    viewOptions: document.querySelectorAll('.view-option'),
    projectViews: document.querySelectorAll('.project-view'),
    listView: document.getElementById('list-view'),
    kanbanView: document.getElementById('kanban-view'),
    ganttView: document.getElementById('gantt-view'),
    // Added for file attachments - make sure this ID exists in HTML
    triggerFileInput: document.getElementById('trigger-file-input'),
};

// --- Utility Functions ---

/**
 * Shows a given modal element.
 * @param {HTMLElement} modalElement The modal to show.
 */
function showModal(modalElement) {
    modalElement.style.display = 'flex'; // Use flex for centering
}

/**
 * Hides a given modal element.
 * @param {HTMLElement} modalElement The modal to hide.
 */
function hideModal(modalElement) {
    modalElement.style.display = 'none';
}

/**
 * Displays a temporary notification message.
 * @param {string} message The message to display.
 * @param {'success'|'error'|'info'} type The type of notification (for styling).
 */
function showNotification(message, type = 'info') {
    const notification = DOMElements.notificationArea;
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.className = 'notification';
        notification.textContent = '';
    }, 5000); // Hide after 5 seconds
}

/**
 * Shows the loading spinner.
 */
function showLoading() {
    DOMElements.loadingSpinner.style.display = 'block';
}

/**
 * Hides the loading spinner.
 */
function hideLoading() {
    DOMElements.loadingSpinner.style.display = 'none';
}

/**
 * Formats a date string (e.g., from DB) to 'YYYY-MM-DD' for HTML date inputs.
 * @param {string|Date} date The date string or Date object.
 * @returns {string} Formatted date string.
 */
function formatDateForInput(date) {
    if (!date) return '';
    let d = new Date(date);
    // Ensure correct timezone offset for input type="date"
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

/**
 * Formats a date string for human-readable display.
 * @param {string|Date} date The date string or Date object.
 * @returns {string} Formatted date string.
 */
function formatDateForDisplay(date) {
    if (!date) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('es-ES', options);
}

/**
 * Promisified confirmation dialog using a modal.
 * @param {string} message The confirmation message.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled.
 */
function confirmAction(message) {
    return new Promise((resolve) => {
        DOMElements.confirmationMessage.textContent = message;
        showModal(DOMElements.confirmationModal);

        const onConfirm = () => {
            hideModal(DOMElements.confirmationModal);
            DOMElements.confirmActionBtn.removeEventListener('click', onConfirm);
            DOMElements.cancelActionBtn.removeEventListener('click', onCancel);
            resolve(true);
        };

        const onCancel = () => {
            hideModal(DOMElements.confirmationModal);
            DOMElements.confirmActionBtn.removeEventListener('click', onConfirm);
            DOMElements.cancelActionBtn.removeEventListener('click', onCancel);
            resolve(false);
        };

        DOMElements.confirmActionBtn.addEventListener('click', onConfirm);
        DOMElements.cancelActionBtn.addEventListener('click', onCancel);
    });
}

/**
 * Simple fetch wrapper to handle common API request patterns.
 * @param {string} url The API endpoint URL.
 * @param {Object} options Fetch options (method, body, headers).
 * @returns {Promise<Object>} JSON response from the API.
 * @throws {Error} If the API response is not OK.
 */
async function fetchWrapper(url, options = {}) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers, // Allow overriding headers
            },
            ...options,
        });

        hideLoading();

        if (response.status === 401) { // Unauthorized, possibly JWT expired or missing
            showNotification('Sesión expirada o no autorizada. Redireccionando al login...', 'error');
            setTimeout(() => window.location.href = '/', 1500);
            throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || `Error: ${response.status} ${response.statusText}`;
            showNotification(errorMessage, 'error');
            throw new Error(errorMessage);
        }

        if (data.message) { // Show success messages from backend
            showNotification(data.message, 'success');
        }

        return data;

    } catch (error) {
        hideLoading();
        console.error('Fetch Error:', error);
        // showNotification(error.message || 'Error de red. Intenta de nuevo.', 'error');
        throw error; // Re-throw to allow specific error handling in calling functions
    }
}

// --- Data Loading and Rendering Functions ---

/**
 * Loads user info and dashboard data (projects).
 */
async function loadDashboardData() {
    try {
        const userInfoData = await fetchWrapper('/user/info', { method: 'GET' });
        loggedInUser = userInfoData;
        DOMElements.userNameDisplay.textContent = `${loggedInUser.nombre} ${loggedInUser.apellido}`;
        DOMElements.userEmailDisplay.textContent = loggedInUser.email;

        const allProjectsData = await fetchWrapper('/projects', { method: 'GET' });
        renderProjects(allProjectsData);
        DOMElements.inicioContainer.style.display = 'flex'; // Show inicio container by default
        DOMElements.projectDashboard.style.display = 'none'; // Hide dashboard
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        // Error handling already in fetchWrapper, might redirect if 401
    }
}

/**
 * Renders owned and member projects in the sidebar.
 * @param {Array<Object>} projects List of project objects.
 */
function renderProjects(projects) {
    DOMElements.ownedProjectsList.innerHTML = '';
    DOMElements.memberProjectsList.innerHTML = '';

    const ownedProjects = projects.filter(p => p.owner === loggedInUser.id);
    const memberProjects = projects.filter(p => p.owner !== loggedInUser.id); // Assuming owner is included in members list, for simplicity

    if (ownedProjects.length === 0) {
        DOMElements.ownedProjectsList.innerHTML = '<li class="no-projects">No has creado proyectos aún.</li>';
    } else {
        ownedProjects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'project-item';
            li.dataset.projectId = project._id;
            li.textContent = project.name;
            DOMElements.ownedProjectsList.appendChild(li);
        });
    }

    if (memberProjects.length === 0) {
        DOMElements.memberProjectsList.innerHTML = '<li class="no-projects">No eres miembro de otros proyectos.</li>';
    } else {
        memberProjects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'project-item';
            li.dataset.projectId = project._id;
            li.textContent = project.name;
            DOMElements.memberProjectsList.appendChild(li);
        });
    }
}

/**
 * Loads project-specific data (tasks, members) and displays the project dashboard.
 * @param {string} projectId The ID of the project to load.
 */
async function loadProjectData(projectId) {
    try {
        showLoading();
        // Get project details to display name
        const allProjects = await fetchWrapper('/projects', { method: 'GET' });
        currentProject = allProjects.find(p => p._id === projectId);

        if (!currentProject) {
            showNotification('Proyecto no encontrado.', 'error');
            hideLoading();
            return;
        }

        DOMElements.selectedProjectNameHeader.textContent = currentProject.name;
        DOMElements.inicioContainer.style.display = 'none';
        DOMElements.projectDashboard.style.display = 'block';

        // Load members for task assignment dropdowns
        const membersData = await fetchWrapper(`/projects/${projectId}/members`, { method: 'GET' });
        allProjectMembers = membersData;
        populateAssigneeDropdowns(membersData);

        // Load tasks
        const tasksData = await fetchWrapper(`/projects/${projectId}/tasks`, { method: 'GET' });
        allProjectTasks = tasksData;

        // Render all views
        renderTasksListView(allProjectTasks);
        renderKanbanView(allProjectTasks);
        renderGanttView(allProjectTasks);

        hideLoading();
    } catch (error) {
        console.error('Error al cargar datos del proyecto:', error);
        showNotification('Error al cargar datos del proyecto.', 'error');
        hideLoading();
    }
}

/**
 * Populates the assignee dropdowns (for tasks and subtasks).
 * @param {Array<Object>} members List of project members.
 */
function populateAssigneeDropdowns(members) {
    const assigneeSelects = [DOMElements.taskAssigneeSelect, DOMElements.subtaskAssigneeSelect];
    assigneeSelects.forEach(select => {
        select.innerHTML = '<option value="">Sin asignar</option>'; // Default option
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member._id;
            option.textContent = `${member.nombre} ${member.apellido}`;
            select.appendChild(option);
        });
    });
}

/**
 * Populates the task dependencies dropdown.
 * @param {Array<Object>} tasks List of tasks for the current project.
 * @param {string} currentTaskId (Optional) The ID of the task being edited, to exclude itself.
 */
function populateDependenciesDropdown(tasks, currentTaskId = null) {
    DOMElements.taskDependenciesSelect.innerHTML = ''; // Clear previous options

    tasks.forEach(task => {
        if (task._id !== currentTaskId) { // A task cannot depend on itself
            const option = document.createElement('option');
            option.value = task._id;
            option.textContent = task.title;
            DOMElements.taskDependenciesSelect.appendChild(option);
        }
    });
}

/**
 * Renders tasks in the list view.
 * @param {Array<Object>} tasksToRender List of tasks to display.
 */
function renderTasksListView(tasksToRender) {
    DOMElements.tasksListItems.innerHTML = ''; // Clear previous tasks

    if (tasksToRender.length === 0) {
        DOMElements.tasksListItems.innerHTML = '<p class="no-tasks">No hay tareas en este proyecto.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'tasks-list-container';

    tasksToRender.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-list-item status-${task.status.replace(/\s/g, '-')} priority-${task.priority}`;
        li.dataset.taskId = task._id;
        li.innerHTML = `
            <div class="task-info">
                <span class="task-title">${task.title}</span>
                <span class="task-status">${task.status}</span>
                <span class="task-due-date">Vence: ${formatDateForDisplay(task.dueDate)}</span>
                <span class="task-priority">${task.priority}</span>
                <span class="task-assigned-to">Asignado a: ${allProjectMembers.find(m => m._id === task.assignedTo)?.nombre || 'N/A'}</span>
            </div>
            <div class="task-actions">
                <button class="btn-small view-task-details">Ver Detalles</button>
            </div>
        `;
        ul.appendChild(li);
    });
    DOMElements.tasksListItems.appendChild(ul);

    // Attach event listeners for 'Ver Detalles' buttons
    ul.querySelectorAll('.view-task-details').forEach(button => {
        button.addEventListener('click', (event) => {
            const taskId = event.target.closest('.task-list-item').dataset.taskId;
            loadTaskDetails(taskId);
        });
    });
}

/**
 * Renders tasks in the Kanban view.
 * @param {Array<Object>} tasksToRender List of tasks to display.
 */
function renderKanbanView(tasksToRender) {
    DOMElements.kanbanViewColumns.innerHTML = ''; // Clear previous columns

    const statuses = ['pendiente', 'en-proceso', 'completada', 'cancelada'];
    const statusLabels = {
        'pendiente': 'Pendiente',
        'en-proceso': 'En Proceso',
        'completada': 'Completada',
        'cancelada': 'Cancelada'
    };

    statuses.forEach(status => {
        const column = document.createElement('div');
        column.className = `kanban-column kanban-column-${status}`;
        column.innerHTML = `
            <h4>${statusLabels[status]}</h4>
            <div class="kanban-tasks-container" data-status="${status}"></div>
        `;
        DOMElements.kanbanViewColumns.appendChild(column);
    });

    tasksToRender.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `kanban-task-card priority-${task.priority}`;
        taskCard.dataset.taskId = task._id;
        taskCard.dataset.currentStatus = task.status; // Store current status for drag-drop (if implemented)
        taskCard.draggable = true; // Make tasks draggable (requires dragover, drop, dragstart handlers)
        taskCard.innerHTML = `
            <h5>${task.title}</h5>
            <p>Vence: ${formatDateForDisplay(task.dueDate)}</p>
            <p>Asignado: ${allProjectMembers.find(m => m._id === task.assignedTo)?.nombre || 'N/A'}</p>
        `;
        const targetColumn = DOMElements.kanbanViewColumns.querySelector(`.kanban-tasks-container[data-status="${task.status}"]`);
        if (targetColumn) {
            targetColumn.appendChild(taskCard);
        }

        // Add click listener to open task details from Kanban card
        taskCard.addEventListener('click', () => loadTaskDetails(task._id));
    });

    // Basic Drag & Drop (for future enhancement, requires backend update to save new status)
    DOMElements.kanbanViewColumns.querySelectorAll('.kanban-tasks-container').forEach(container => {
        container.addEventListener('dragover', e => e.preventDefault()); // Allow drop
        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = container.dataset.status;
            const taskCard = DOMElements.kanbanViewColumns.querySelector(`[data-task-id="${taskId}"]`);

            if (taskCard && taskCard.dataset.currentStatus !== newStatus) {
                // Update UI immediately (optimistic update)
                container.appendChild(taskCard);
                taskCard.dataset.currentStatus = newStatus;

                // Call backend to update status
                try {
                    await fetchWrapper(`/projects/${currentProject._id}/tasks/${taskId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: newStatus })
                    });
                    showNotification('Estado de tarea actualizado con éxito.', 'success');
                    // Reload tasks to ensure consistency
                    await loadProjectData(currentProject._id);
                } catch (error) {
                    showNotification('Error al actualizar el estado de la tarea.', 'error');
                    console.error('Drag and Drop Update Error:', error);
                    // Revert UI change if backend fails (pessimistic update if preferred)
                    await loadProjectData(currentProject._id);
                }
            }
        });
    });

    DOMElements.kanbanViewColumns.querySelectorAll('.kanban-task-card').forEach(card => {
        card.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', card.dataset.taskId);
        });
    });
}

/**
 * Renders tasks in the Gantt view using Frappe Gantt.
 * @param {Array<Object>} tasksToRender List of tasks to display.
 */
function renderGanttView(tasksToRender) {
    // If no tasks, ensure ganttChart is null and display message
    if (tasksToRender.length === 0) {
        DOMElements.ganttChartContainer.innerHTML = '<p class="no-tasks">No hay tareas para mostrar en la vista Gantt.</p>';
        ganttChart = null; // Explicitly set to null
        return;
    }

    const ganttTasks = tasksToRender.map(task => ({
        id: task._id,
        name: task.title,
        start: formatDateForInput(task.startDate), // Frappe Gantt expects YYYY-MM-DD
        end: formatDateForInput(task.dueDate),
        progress: task.progressPercentage || 0,
        dependencies: task.dependencies && task.dependencies.length > 0 ? task.dependencies.join(',') : '', // Comma-separated IDs
        custom_class: `gantt-task-${task.status.replace(/\s/g, '-')}` // For custom styling based on status
    }));

    if (ganttChart) {
        ganttChart.refresh(ganttTasks); // Update existing chart
    } else {
        DOMElements.ganttChartContainer.innerHTML = ''; // Clear existing content before creating new chart
        ganttChart = new Gantt(DOMElements.ganttChartContainer, ganttTasks, {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ['Day', 'Week', 'Month'],
            bar_height: 20,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            date_format: 'YYYY-MM-DD',
            custom_popup_html: function(task) {
                return `
                    <div class="details-container">
                        <h5>${task.name}</h5>
                        <p>Descripción: ${task.description || 'N/A'}</p>
                        <p>Fecha Inicio: ${formatDateForDisplay(task.start)}</p>
                        <p>Fecha Límite: ${formatDateForDisplay(task.end)}</p>
                        <p>Prioridad: ${task.priority || 'N/A'}</p>
                        <p>Estado: ${task.status || 'N/A'}</p>
                        <p>Asignado a: ${allProjectMembers.find(m => m._id === task.assignedTo)?.nombre || 'N/A'}</p>
                        <p>Progreso: ${task.progress}%</p>
                    </div>
                `;
            },
            on_click: function(task) {
                loadTaskDetails(task.id); // Open task detail modal
            },
            on_date_change: async function(task, start, end) {
                const confirmed = await confirmAction(`¿Seguro que quieres actualizar las fechas de la tarea "${task.name}" a ${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}?`);
                if (confirmed) {
                    try {
                        await fetchWrapper(`/projects/${currentProject._id}/tasks/${task.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                startDate: start.toISOString().split('T')[0],
                                dueDate: end.toISOString().split('T')[0]
                            })
                        });
                        showNotification('Fechas de tarea actualizadas.', 'success');
                        await loadProjectData(currentProject._id); // Reload all data to refresh views
                    } catch (error) {
                        showNotification('Error al actualizar fechas de tarea.', 'error');
                        console.error('Gantt Date Change Error:', error);
                        await loadProjectData(currentProject._id); // Revert changes if error
                    }
                } else {
                    ganttChart.refresh(ganttTasks); // Revert UI if cancelled
                }
            },
            on_progress_change: async function(task, progress) {
                const confirmed = await confirmAction(`¿Seguro que quieres actualizar el progreso de la tarea "${task.name}" a ${progress}%?`);
                if (confirmed) {
                    try {
                        await fetchWrapper(`/projects/${currentProject._id}/tasks/${task.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ progressPercentage: progress })
                        });
                        showNotification('Progreso de tarea actualizado.', 'success');
                        await loadProjectData(currentProject._id);
                    } catch (error) {
                        showNotification('Error al actualizar progreso de tarea.', 'error');
                        console.error('Gantt Progress Change Error:', error);
                        await loadProjectData(currentProject._id);
                    }
                } else {
                    ganttChart.refresh(ganttTasks); // Revert UI if cancelled
                }
            },
            on_view_change: function(mode) {
                // console.log(`Vista de Gantt cambiada a: ${mode}`);
            }
        });
        ganttChart.change_view_mode('Week'); // Set initial view for new chart
    }
}

// --- Event Handlers ---

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', loadDashboardData);

// Open project modal
DOMElements.addProjectBtn.addEventListener('click', () => showModal(DOMElements.projectModal));
DOMElements.createProjectFromInicioBtn.addEventListener('click', () => showModal(DOMElements.projectModal));

// Close project modal
DOMElements.cancelProjectBtn.addEventListener('click', () => hideModal(DOMElements.projectModal));

// Handle project creation form submission
DOMElements.createProjectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = DOMElements.projectNameInput.value;
    const description = DOMElements.projectDescriptionInput.value;
    const startDate = DOMElements.projectIniDateInput.value;
    const dueDate = DOMElements.projectVenDateInput.value;

    try {
        await fetchWrapper('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description, startDate, dueDate })
        });
        hideModal(DOMElements.projectModal);
        DOMElements.createProjectForm.reset(); // Clear form
        await loadDashboardData(); // Reload projects in sidebar
    } catch (error) {
        // Error notification handled by fetchWrapper
        console.error('Error al crear proyecto:', error);
    }
});

// Event delegation for project list clicks
DOMElements.ownedProjectsList.addEventListener('click', (event) => {
    const projectItem = event.target.closest('.project-item');
    if (projectItem) {
        loadProjectData(projectItem.dataset.projectId);
    }
});
DOMElements.memberProjectsList.addEventListener('click', (event) => {
    const projectItem = event.target.closest('.project-item');
    if (projectItem) {
        loadProjectData(projectItem.dataset.projectId);
    }
});

// View options (list, kanban, gantt)
DOMElements.viewOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Deactivate all options and views
        DOMElements.viewOptions.forEach(opt => opt.classList.remove('active'));
        DOMElements.projectViews.forEach(view => view.classList.remove('active'));

        // Activate selected option and view
        option.classList.add('active');
        const targetViewId = option.dataset.view + '-view';
        document.getElementById(targetViewId).classList.add('active');

        // Re-render Gantt if it becomes active to ensure it's visible
        // Only try to change view mode if ganttChart is initialized (i.e., not null)
        if (option.dataset.view === 'gantt' && currentProject && ganttChart) {
            ganttChart.change_view_mode('Week'); // Reset view mode on tab switch
        } else if (option.dataset.view === 'gantt' && currentProject && !ganttChart) {
            // If ganttChart is null (e.g., no tasks initially), re-render
            renderGanttView(allProjectTasks);
        }
    });
});

// Open task modal (from List or Kanban)
DOMElements.addTaskBtn.addEventListener('click', () => {
    if (!currentProject) {
        showNotification('Selecciona un proyecto primero.', 'info');
        return;
    }
    populateAssigneeDropdowns(allProjectMembers); // Repopulate in case members change
    populateDependenciesDropdown(allProjectTasks); // Repopulate with existing tasks
    showModal(DOMElements.taskModal);
});
DOMElements.addTaskKanbanBtn.addEventListener('click', () => {
    if (!currentProject) {
        showNotification('Selecciona un proyecto primero.', 'info');
        return;
    }
    populateAssigneeDropdowns(allProjectMembers);
    populateDependenciesDropdown(allProjectTasks);
    showModal(DOMElements.taskModal);
});

// Close task modal
DOMElements.cancelTaskBtn.addEventListener('click', () => hideModal(DOMElements.taskModal));

// Handle task creation
DOMElements.saveTaskBtn.addEventListener('click', async () => {
    if (!currentProject) return;
    const title = DOMElements.taskTitleInput.value;
    const description = DOMElements.taskDescriptionInput.value;
    const startDate = DOMElements.taskIniDateInput.value;
    const dueDate = DOMElements.taskLimDateInput.value;
    const priority = DOMElements.taskPrioritySelect.value;
    const assignedTo = DOMElements.taskAssigneeSelect.value || null;
    const dependencies = Array.from(DOMElements.taskDependenciesSelect.selectedOptions).map(option => option.value);
    if (!title || !startDate || !dueDate) {
        showNotification('Título, fecha de inicio y fecha límite de la tarea son obligatorios.', 'error');
        return;
    }
    try {
        await fetchWrapper(`/projects/${currentProject._id}/tasks`, {
            method: 'POST',
            body: JSON.stringify({
                title, description, startDate, dueDate, priority, assignedTo, dependencies
            })
        });
        hideModal(DOMElements.taskModal);
        // Reset form
        DOMElements.taskTitleInput.value = '';
        DOMElements.taskDescriptionInput.value = '';
        DOMElements.taskIniDateInput.value = '';
        DOMElements.taskLimDateInput.value = '';
        DOMElements.taskPrioritySelect.value = 'media';
        DOMElements.taskAssigneeSelect.value = '';
        DOMElements.taskDependenciesSelect.innerHTML = '';
        await loadProjectData(currentProject._id);
    } catch (error) {
        console.error('Error al crear tarea:', error);
    }
});

DOMElements.saveSubtaskBtn.addEventListener('click', async () => {
    if (!currentProject || !currentTaskId) return;
    const title = DOMElements.subtaskTitleInput.value;
    const description = DOMElements.subtaskDescriptionInput.value; 
    const startDate = DOMElements.subtaskIniDateInput.value;
    const dueDate = DOMElements.subtaskLimDateInput.value;
    const priority = DOMElements.subtaskPrioritySelect.value;
    const assignedTo = DOMElements.subtaskAssigneeSelect.value || null;
    if (!title || !startDate || !dueDate) {
        showNotification('Título, fecha de inicio y fecha límite de la subtarea son obligatorios.', 'error');
        return;
    }
    try {
        await fetchWrapper(`/projects/${currentProject._id}/tasks/${currentTaskId}/subtasks`, {
            method: 'POST',
            body: JSON.stringify({
                title, description, startDate, dueDate, priority, assignedTo
            })
        });
        hideModal(DOMElements.subtaskModal);
        // Reset form
        DOMElements.subtaskTitleInput.value = '';
        DOMElements.subtaskDescriptionInput.value = '';
        DOMElements.subtaskIniDateInput.value = '';
        DOMElements.subtaskLimDateInput.value = '';
        DOMElements.subtaskPrioritySelect.value = 'media';
        DOMElements.subtaskAssigneeSelect.value = '';
        await loadSubtasks(currentTaskId);
    } catch (error) {
        console.error('Error al crear subtarea:', error);
    }
});

// --- Task Detail Modal Logic ---
let currentTaskId = null; // Store ID of task currently displayed in detail modal

/**
 * Loads and displays task details in the task-detail-modal.
 * @param {string} taskId The ID of the task to load.
 */
async function loadTaskDetails(taskId) {
    currentTaskId = taskId; // Set current task ID for other actions

    try {
        showLoading();
        // Get the full task object from cached allProjectTasks
        // Fix: Ensure we are looking in allProjectTasks, not allProjectMembers, for tasks
        const task = allProjectTasks.find(t => t._id === taskId); 
        if (!task) {
            showNotification('Tarea no encontrada.', 'error');
            hideLoading();
            return;
        }

        // Populate basic task details
        DOMElements.detailTaskTitle.textContent = task.title;
        DOMElements.detailTaskDescription.textContent = task.description || 'No hay descripción.';
        DOMElements.detailTaskIniDate.textContent = formatDateForDisplay(task.startDate);
        DOMElements.detailTaskLimDate.textContent = formatDateForDisplay(task.dueDate);
        DOMElements.detailTaskPriority.textContent = task.priority;
        DOMElements.detailTaskStatus.textContent = task.status;
        DOMElements.changeTaskStatusSelect.value = task.status; // Set value for dropdown
        DOMElements.markTaskCompleteCheckbox.checked = task.status === 'completada';

        // Find assignee name
        const assignedToMember = allProjectMembers.find(m => m._id === task.assignedTo);
        DOMElements.detailTaskAssignedTo.textContent = assignedToMember ? `${assignedToMember.nombre} ${assignedToMember.apellido}` : 'Sin asignar';

        // Load comments
        await loadTaskComments(taskId);

        // Load subtasks
        await loadSubtasks(taskId);
        
        // Populate collaborators list for the task
        // Assuming collaboratorsList element exists and you want to show who is assigned to this task
        DOMElements.collaboratorsList.innerHTML = '';
        if (task.assignedTo) {
            const assignedUser = allProjectMembers.find(m => m._id === task.assignedTo);
            if (assignedUser) {
                const li = document.createElement('li');
                li.textContent = `${assignedUser.nombre} ${assignedUser.apellido}`;
                DOMElements.collaboratorsList.appendChild(li);
            }
        }


        // Hide change status dropdown initially
        DOMElements.changeTaskStatusSelect.style.display = 'none';
        DOMElements.detailTaskStatus.style.display = 'inline';

        showModal(DOMElements.taskDetailModal);
        hideLoading();
    } catch (error) {
        console.error('Error al cargar detalles de la tarea:', error);
        showNotification('Error al cargar detalles de la tarea.', 'error');
        hideLoading();
    }
}

/**
 * Loads and renders comments for a specific task.
 * @param {string} taskId The ID of the task.
 */
async function loadTaskComments(taskId) {
    DOMElements.taskCommentsList.innerHTML = ''; // Clear previous comments
    try {
        const commentsData = await fetchWrapper(`/projects/${currentProject._id}/tasks/${taskId}/comments`, { method: 'GET' });
        if (commentsData.length === 0) {
            DOMElements.taskCommentsList.innerHTML = '<p class="no-comments">No hay comentarios aún.</p>';
            return;
        }
        commentsData.forEach(comment => {
            const li = document.createElement('li');
            // Assuming you want to display author name, you'd need to fetch user details or join in backend
            const author = allProjectMembers.find(m => m._id === comment.authorId);
            const authorName = author ? `${author.nombre} ${author.apellido}` : 'Usuario desconocido';
            li.innerHTML = `<strong>${authorName}</strong> (${formatDateForDisplay(comment.date)}): ${comment.text}`;
            DOMElements.taskCommentsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        showNotification('Error al cargar comentarios.', 'error');
    }
}

/**
 * Adds a new comment to the current task.
 */
DOMElements.addCommentBtn.addEventListener('click', async () => {
    if (!currentProject || !currentTaskId) return;

    const commentText = DOMElements.newCommentInput.value.trim();
    if (!commentText) {
        showNotification('El comentario no puede estar vacío.', 'error');
        return;
    }

    try {
        await fetchWrapper(`/projects/${currentProject._id}/tasks/${currentTaskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text: commentText })
        });
        DOMElements.newCommentInput.value = ''; // Clear input
        await loadTaskComments(currentTaskId); // Reload comments
    } catch (error) {
        console.error('Error al añadir comentario:', error);
    }
});

// Toggle status edit dropdown
DOMElements.toggleStatusEditBtn.addEventListener('click', () => {
    if (DOMElements.changeTaskStatusSelect.style.display === 'none') {
        DOMElements.changeTaskStatusSelect.style.display = 'inline';
        DOMElements.detailTaskStatus.style.display = 'none';
        DOMElements.toggleStatusEditBtn.textContent = 'Guardar Estado';
    } else {
        // Save new status
        const newStatus = DOMElements.changeTaskStatusSelect.value;
        handleUpdateTaskStatus(newStatus);
        DOMElements.changeTaskStatusSelect.style.display = 'none';
        DOMElements.detailTaskStatus.style.display = 'inline';
        DOMElements.toggleStatusEditBtn.textContent = 'Cambiar Estado';
    }
});

// Update status on checkbox change (for 'completada')
DOMElements.markTaskCompleteCheckbox.addEventListener('change', (event) => {
    const newStatus = event.target.checked ? 'completada' : 'en-proceso'; // Or 'pendiente'
    handleUpdateTaskStatus(newStatus);
});

/**
 * Handles updating task status and percentage.
 * @param {string} newStatus The new status for the task.
 */
async function handleUpdateTaskStatus(newStatus) {
    if (!currentProject || !currentTaskId) return;

    const progressPercentage = newStatus === 'completada' ? 100 : (newStatus === 'pendiente' ? 0 : 50); // Simple progress logic

    try {
        await fetchWrapper(`/projects/${currentProject._id}/tasks/${currentTaskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus, progressPercentage: progressPercentage })
        });
        DOMElements.detailTaskStatus.textContent = newStatus; // Update UI
        DOMElements.markTaskCompleteCheckbox.checked = newStatus === 'completada';
        await loadProjectData(currentProject._id); // Reload to update all views
    } catch (error) {
        console.error('Error al actualizar estado de tarea:', error);
    }
}

/**
 * Loads and renders subtasks for a specific task.
 * @param {string} taskId The ID of the task.
 */
async function loadSubtasks(taskId) {
    DOMElements.subtasksList.innerHTML = ''; // Clear previous subtasks
    try {
        const subtasksData = await fetchWrapper(`/projects/${currentProject._id}/tasks/${taskId}/subtasks`, { method: 'GET' });
        if (subtasksData.length === 0) {
            DOMElements.subtasksList.innerHTML = '<p class="no-subtasks">No hay subtareas aún.</p>';
            return;
        }
        subtasksData.forEach(subtask => {
            const li = document.createElement('li');
            const assignedToName = allProjectMembers.find(m => m._id === subtask.assignedTo)?.nombre || 'Sin asignar';
            li.innerHTML = `
                <strong>${subtask.title}</strong> (${subtask.status}) - Asignado a: ${assignedToName}
                <p>${subtask.description || ''}</p>
                <small>Vence: ${formatDateForDisplay(subtask.dueDate)}</small>
            `;
            DOMElements.subtasksList.appendChild(li);
        });
    } catch (error) {
        console.error('Error al cargar subtareas:', error);
        showNotification('Error al cargar subtareas.', 'error');
    }
}

// Open subtask modal
DOMElements.addSubtaskBtn.addEventListener('click', () => {
    if (!currentProject || !currentTaskId) return;
    populateAssigneeDropdowns(allProjectMembers); // Subtasks can also be assigned
    showModal(DOMElements.subtaskModal);
});

// Close subtask modal
DOMElements.cancelSubtaskBtn.addEventListener('click', () => hideModal(DOMElements.subtaskModal));

// Handle subtask creation
DOMElements.saveSubtaskBtn.addEventListener('click', async () => {
    if (!currentProject || !currentTaskId) return;

    const title = DOMElements.subtaskTitleInput.value;
    const description = DOMElements.subtaskDescriptionInput.value; 
    const startDate = DOMElements.subtaskIniDateInput.value;
    const dueDate = DOMElements.subtaskLimDateInput.value;
    const priority = DOMElements.subtaskPrioritySelect.value;
    const assignedTo = DOMElements.subtaskAssigneeSelect.value || null;

    if (!title || !startDate || !dueDate) {
        showNotification('Título, fecha de inicio y fecha límite de la subtarea son obligatorios.', 'error');
        return;
    }

    // Validación al guardar una subtarea
    DOMElements.saveSubtaskBtn.addEventListener('click', async () => {
        if (!currentProject || !currentTaskId) return;
        const startDate = DOMElements.subtaskIniDateInput.value;
        const dueDate = DOMElements.subtaskLimDateInput.value;

        // Buscar la tarea principal
        const parentTask = allProjectTasks.find(t => t._id === currentTaskId);
        if (!parentTask) return;

        // Validar fechas de la subtarea con respecto a la tarea principal
        if (startDate < parentTask.startDate || dueDate > parentTask.dueDate) {
            showNotification(
                `No se puede guardar la subtarea porque sus fechas (${startDate} a ${dueDate}) están fuera del rango de la tarea principal (${parentTask.startDate} a ${parentTask.dueDate}).`,
                'error'
            );
            return;
        }

        try {
            await fetchWrapper(`/projects/${currentProject._id}/tasks/${currentTaskId}/subtasks`, {
                method: 'POST',
                body: JSON.stringify({
                    title, description, startDate, dueDate, priority, assignedTo
                })
            });
            hideModal(DOMElements.subtaskModal);
            // Reset form
            DOMElements.subtaskTitleInput.value = '';
            DOMElements.subtaskDescriptionInput.value = '';
            DOMElements.subtaskIniDateInput.value = '';
            DOMElements.subtaskLimDateInput.value = '';
            DOMElements.subtaskPrioritySelect.value = 'media';
            DOMElements.subtaskAssigneeSelect.value = '';
            await loadSubtasks(currentTaskId); // Reload subtareas in detail modal
        } catch (error) {
            console.error('Error al crear subtarea:', error);
        }
    });
});


// Delete Task
DOMElements.deleteTaskBtn.addEventListener('click', async () => {
    if (!currentProject || !currentTaskId) return;

    const confirmed = await confirmAction('¿Estás seguro de que quieres eliminar esta tarea y todos sus datos relacionados (subtareas, comentarios, dependencias)? Esta acción no se puede deshacer.');

    if (confirmed) {
        try {
            await fetchWrapper(`/projects/${currentProject._id}/tasks/${currentTaskId}`, {
                method: 'DELETE'
            });
            hideModal(DOMElements.taskDetailModal);
            currentTaskId = null; // Clear current task
            await loadProjectData(currentProject._id); // Reload project tasks
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
        }
    }
});

// Close Task Detail Modal
DOMElements.closeTaskDetailBtn.addEventListener('click', () => {
    hideModal(DOMElements.taskDetailModal);
    currentTaskId = null; // Clear current task
});


// Handle invite user to project
DOMElements.inviteUsersBtn.addEventListener('click', () => {
    if (!currentProject) {
        showNotification('Selecciona un proyecto primero para invitar usuarios.', 'info');
        return;
    }
    showModal(DOMElements.inviteModal);
});
DOMElements.closeInviteBtn.addEventListener('click', () => hideModal(DOMElements.inviteModal));
DOMElements.sendInviteEmailBtn.addEventListener('click', async () => {
    if (!currentProject) return;

    const email = DOMElements.inviteEmailInput.value;
    const role = DOMElements.inviteRoleSelect.value;

    if (!email || !role) {
        showNotification('Correo electrónico y rol son obligatorios.', 'error');
        return;
    }

    try {
        await fetchWrapper(`/projects/${currentProject._id}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
        hideModal(DOMElements.inviteModal);
        DOMElements.inviteEmailInput.value = ''; // Clear form
        showNotification(`Invitación enviada a ${email} como ${role}.`, 'success');
        // Reload project members in case the invited user was already in the system
        await loadProjectData(currentProject._id);
    } catch (error) {
        console.error('Error al enviar invitación:', error);
    }
});


// Profile editing
DOMElements.userProfileArea.addEventListener('click', async () => {
    if (loggedInUser) {
        // Populate form with current user info
        DOMElements.editUsernameInput.value = loggedInUser.nombre;
        DOMElements.editUserLastnameInput.value = loggedInUser.apellido;
        DOMElements.editUserEmailInput.value = loggedInUser.email;
        DOMElements.editPasswordInput.value = ''; // Always clear password field for security
        showModal(DOMElements.editProfileModal);
    } else {
        showNotification('No se pudo cargar la información del usuario. Intente recargar la página.', 'error');
    }
});
DOMElements.cancelEditProfileBtn.addEventListener('click', () => hideModal(DOMElements.editProfileModal));
DOMElements.editProfileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nombre = DOMElements.editUsernameInput.value;
    const apellido = DOMElements.editUserLastnameInput.value;
    const newPassword = DOMElements.editPasswordInput.value;

    const updateData = { nombre, apellido };
    if (newPassword) {
        updateData.newPassword = newPassword;
    }

    try {
        await fetchWrapper('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        hideModal(DOMElements.editProfileModal);
        DOMElements.editPasswordInput.value = ''; // Clear password
        await loadDashboardData(); // Reload user info in sidebar
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
    }
});


// --- Task Filters ---
DOMElements.applyFiltersBtn.addEventListener('click', () => {
    const statusFilter = DOMElements.filterStatusSelect.value;
    const priorityFilter = DOMElements.filterPrioritySelect.value;

    let filteredTasks = allProjectTasks;

    if (statusFilter) {
        filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }

    renderTasksListView(filteredTasks);
});


// --- Frappe Gantt Controls ---
DOMElements.zoomInBtn.addEventListener('click', () => {
    if (ganttChart) ganttChart.zoom_in();
});
DOMElements.zoomOutBtn.addEventListener('click', () => {
    if (ganttChart) ganttChart.zoom_out();
});
DOMElements.fitViewBtn.addEventListener('click', () => {
    if (ganttChart) {
        // Frappe Gantt does not have a direct 'fit_to_view' method.
        // For now, we reset to a default view, e.g., 'Week'.
        ganttChart.change_view_mode('Week'); 
        showNotification('La función "Ajustar Vista" ha restablecido el Gantt a la vista semanal.', 'info');
    }
});

// Mock for Edit Task (requires a separate modal or inline editing)
// For simplicity, `edit-task-btn` will just log a message.
// A full implementation would involve populating a task editing form and sending a PUT request.
DOMElements.editTaskBtn.addEventListener('click', () => {
    showNotification('Funcionalidad de edición de tarea no implementada aún.', 'info');
    // TODO: Implement task editing modal/form
});


// Mock for File Attachments (requires Multer on backend and file storage)
// Added a check to ensure triggerFileInput exists before adding listener
if (DOMElements.triggerFileInput) {
    DOMElements.triggerFileInput.addEventListener('click', () => {
        showNotification('La carga de archivos adjuntos no está implementada aún. Necesitarías una API de carga de archivos.', 'info');
        // DOMElements.fileInput.click(); // This would open the file dialog
    });
}
// DOMElements.fileInput.addEventListener('change', (event) => {
//     const files = event.target.files;
//     // TODO: Implement file upload logic (e.g., using FormData and fetch)
//     showNotification(`Adjuntando ${files.length} archivos...`, 'info');
// });

