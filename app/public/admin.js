// Funcionalidad básica
document.addEventListener('DOMContentLoaded', function() {
    // Cambiar vistas
    const viewOptions = document.querySelectorAll('.view-option');
    const projectViews = document.querySelectorAll('.project-view');
    
    viewOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Quitar clase active de todas las opciones
            viewOptions.forEach(opt => opt.classList.remove('active'));
            // Añadir clase active a la opción seleccionada
            this.classList.add('active');
            
            // Ocultar todas las vistas
            projectViews.forEach(view => view.classList.remove('active'));
            // Mostrar la vista seleccionada
            const viewId = this.getAttribute('data-view') + '-view';
            document.getElementById(viewId).classList.add('active');
            
            // Si es la vista Gantt, redibujar el gráfico
            if (viewId === 'gantt-view') {
                updateGanttChart();
            }
        });
    });
    
    // Mostrar/ocultar modales
    const projectModal = document.getElementById('project-modal');
    const taskModal = document.getElementById('task-modal');
    const inviteModal = document.getElementById('invite-modal');
    const notification = document.getElementById('notification');
    
    document.getElementById('add-project-btn').addEventListener('click', function() {
        projectModal.style.display = 'flex';
    });
    
    document.getElementById('add-task-btn').addEventListener('click', function() {
        taskModal.style.display = 'flex';
    });
    
    document.getElementById('add-task-kanban-btn').addEventListener('click', function() {
        taskModal.style.display = 'flex';
    });
    
    document.getElementById('cancel-project').addEventListener('click', function() {
        projectModal.style.display = 'none';
    });
    
    document.getElementById('cancel-task').addEventListener('click', function() {
        taskModal.style.display = 'none';
    });
    
    document.getElementById('close-invite').addEventListener('click', function() {
        inviteModal.style.display = 'none';
    });
    
    // Simular guardado de proyecto
    document.getElementById('save-project').addEventListener('click', function() {
        projectModal.style.display = 'none';
        showNotification('Proyecto creado correctamente');
    });
    
    // Simular guardado de tarea
    document.getElementById('save-task').addEventListener('click', function() {
        taskModal.style.display = 'none';
        showNotification('Tarea creada correctamente');
        // Actualizar el diagrama de Gantt si está visible
        if (document.getElementById('gantt-view').classList.contains('active')) {
            updateGanttChart();
        }
    });
    
    // Función para mostrar notificaciones
    function showNotification(message) {
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    // Generar código de invitación aleatorio
    function generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    // Establecer código de invitación al cargar
    document.getElementById('invite-code').value = generateInviteCode();
    
    // Funcionalidad de copiar
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            input.select();
            document.execCommand('copy');
            showNotification('Copiado al portapapeles');
        });
    });
    
    // Selección de proyecto
    const projectItems = document.querySelectorAll('.project-item');
    projectItems.forEach(item => {
        item.addEventListener('click', function() {
            // Aquí cargarías los datos del proyecto seleccionado
            showNotification(`Proyecto "${this.textContent}" seleccionado`);
            // Actualizar el diagrama de Gantt si está visible
            if (document.getElementById('gantt-view').classList.contains('active')) {
                updateGanttChart();
            }
        });
    });
    
    // Diagrama de Gantt
    let ganttChart;
    
    function updateGanttChart() {
        // Datos de ejemplo para el diagrama de Gantt
        const tasks = [
            {
                id: 'Tarea 1',
                name: 'Diseño de interfaz',
                start: '2023-05-01',
                end: '2023-05-05',
                progress: 80,
                dependencies: ''
            },
            {
                id: 'Tarea 2',
                name: 'Desarrollo backend',
                start: '2023-05-03',
                end: '2023-05-10',
                progress: 30,
                dependencies: 'Tarea 1'
            },
            {
                id: 'Tarea 3',
                name: 'Pruebas de integración',
                start: '2023-05-08',
                end: '2023-05-15',
                progress: 5,
                dependencies: 'Tarea 2'
            },
            {
                id: 'Tarea 4',
                name: 'Documentación',
                start: '2023-05-10',
                end: '2023-05-12',
                progress: 0,
                dependencies: 'Tarea 2'
            }
        ];
        
        // Destruir el gráfico existente si hay uno
        if (ganttChart) {
            ganttChart.destroy();
        }
        
        // Crear nuevo gráfico
        ganttChart = new Gantt('#gantt-chart', tasks, {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ['Day', 'Week', 'Month'],
            bar_height: 20,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            view_mode: 'Week',
            date_format: 'YYYY-MM-DD',
            custom_popup_html: function(task) {
                return `
                    <div class="details-container">
                        <h5>${task.name}</h5>
                        <p>Desde: ${task.start}</p>
                        <p>Hasta: ${task.end}</p>
                        <p>Progreso: ${task.progress}%</p>
                    </div>
                `;
            }
        });
        
        // Configurar controles de zoom
        document.getElementById('zoom-in').addEventListener('click', function() {
            ganttChart.change_view_mode('Day');
        });
        
        document.getElementById('zoom-out').addEventListener('click', function() {
            ganttChart.change_view_mode('Month');
        });
        
        document.getElementById('fit-view').addEventListener('click', function() {
            ganttChart.change_view_mode('Week');
        });
    }
    
    // Inicializar el diagrama de Gantt si la vista está activa
    if (document.getElementById('gantt-view').classList.contains('active')) {
        updateGanttChart();
    }
});
