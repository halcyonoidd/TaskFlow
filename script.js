// TaskFlow - Productivity Dashboard
// Hackathon Project

class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.draggedTask = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.initializeDragAndDrop();
    }

    bindEvents() {
        // Modal events
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showAddTaskModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideAddTaskModal());
        document.getElementById('closeDetailModal').addEventListener('click', () => this.hideTaskDetailModal());
        document.getElementById('cancelTask').addEventListener('click', () => this.hideAddTaskModal());

        // Form events
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleAddTask(e));

        // Filter events
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // Task detail events
        document.getElementById('editTaskBtn').addEventListener('click', () => this.editCurrentTask());
        document.getElementById('startTaskBtn')?.addEventListener('click', () => this.startCurrentTask());
        document.getElementById('completeTaskBtn')?.addEventListener('click', () => this.completeCurrentTask());
        document.getElementById('deleteTaskBtn').addEventListener('click', () => this.deleteCurrentTask());

        // Profile modal bindings (header button is outside modal)
        document.getElementById('userProfileBtn')?.addEventListener('click', () => this.showProfileModal());
        document.getElementById('closeProfileModal')?.addEventListener('click', () => this.hideProfileModal());
        document.getElementById('cancelProfile')?.addEventListener('click', () => this.hideProfileModal());
        document.getElementById('profileForm')?.addEventListener('submit', (e) => this.handleProfileSave(e));

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }

    // Task CRUD Operations
    addTask(taskData) {
        const task = {
            id: Date.now().toString(),
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            // Allow caller to provide initial status (useful for sample tasks)
            status: taskData.status || 'pending',
            dueDate: taskData.dueDate || '',
            createdAt: new Date().toISOString(),
            completedAt: taskData.status === 'completed' ? (taskData.completedAt || new Date().toISOString()) : null
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.hideAddTaskModal();
        this.showNotification('Task berhasil ditambahkan!', 'success');
    }

    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            const wasCompleted = this.tasks[taskIndex].status === 'completed';
            this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
            // If task moved to completed and wasn't completed before, set completedAt
            if (updates.status === 'completed' && !wasCompleted) {
                this.tasks[taskIndex].completedAt = new Date().toISOString();
            }
            // If status changed away from completed, clear completedAt
            if (updates.status && updates.status !== 'completed') {
                this.tasks[taskIndex].completedAt = null;
            }
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    completeCurrentTask() {
        const taskId = document.getElementById('taskDetailModal').dataset.currentTaskId;
        if (!taskId) return;
        this.updateTask(taskId, { status: 'completed' });
        this.hideTaskDetailModal();
        this.showNotification('Task ditandai selesai!', 'success');
    }

    startCurrentTask() {
        const taskId = document.getElementById('taskDetailModal').dataset.currentTaskId;
        if (!taskId) return;
        this.updateTask(taskId, { status: 'in-progress' });
        this.hideTaskDetailModal();
        this.showNotification('Task dipindahkan ke In Progress!', 'success');
    }

    // Profile Methods
    showProfileModal() {
        const modal = document.getElementById('profileModal');
        const profile = this.loadProfile();
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        modal.classList.add('show');
    }

    hideProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.classList.remove('show');
    }

    handleProfileSave(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profile = {
            name: formData.get('name'),
            email: formData.get('email')
        };
        localStorage.setItem('taskflow-profile', JSON.stringify(profile));
        this.hideProfileModal();
        this.updateHeaderProfile();
        this.showNotification('Profil disimpan!', 'success');
    }

    loadProfile() {
        const raw = localStorage.getItem('taskflow-profile');
        return raw ? JSON.parse(raw) : {};
    }

    updateHeaderProfile() {
        const profile = this.loadProfile();
        const nameEl = document.getElementById('userName');
        if (profile.name) {
            nameEl.textContent = profile.name;
            nameEl.style.display = 'inline-block';
        } else {
            nameEl.style.display = 'none';
        }
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.hideTaskDetailModal();
        this.showNotification('Task berhasil dihapus!', 'success');
    }

    // UI Methods
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        const taskLists = {
            pending: document.getElementById('todoList'),
            'in-progress': document.getElementById('inProgressList'),
            completed: document.getElementById('completedList')
        };

        // Clear all lists
        Object.values(taskLists).forEach(list => {
            list.innerHTML = '';
        });

        // Render tasks
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskLists[task.status].appendChild(taskElement);
        });

        // Update column counts
        this.updateColumnCounts();
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item priority-${task.priority} ${task.status === 'completed' ? 'completed' : ''}`;
        taskDiv.draggable = true;
        taskDiv.dataset.taskId = task.id;

        const priorityText = {
            high: 'Tinggi',
            medium: 'Sedang',
            low: 'Rendah'
        };

        const statusText = {
            pending: 'Pending',
            'in-progress': 'In Progress',
            completed: 'Completed'
        };

        taskDiv.innerHTML = `
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <span class="priority-badge priority-${task.priority}">${priorityText[task.priority]}</span>
                ${task.dueDate ? `<span class="task-due-date">Due: ${this.formatDate(task.dueDate)}</span>` : ''}
            </div>
        `;

        // Add click event for task details
        taskDiv.addEventListener('click', () => this.showTaskDetail(task.id));

        // Add drag events
        taskDiv.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
        taskDiv.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return taskDiv;
    }

    showTaskDetail(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const modal = document.getElementById('taskDetailModal');
        const priorityText = {
            high: 'Tinggi',
            medium: 'Sedang',
            low: 'Rendah'
        };

        const statusText = {
            pending: 'Pending',
            'in-progress': 'In Progress',
            completed: 'Completed'
        };

        document.getElementById('detailTaskTitle').textContent = task.title;
        document.getElementById('detailPriority').textContent = priorityText[task.priority];
        document.getElementById('detailPriority').className = `priority-badge priority-${task.priority}`;
        document.getElementById('detailStatus').textContent = statusText[task.status];
        document.getElementById('detailStatus').className = `status-badge status-${task.status}`;
        document.getElementById('detailDescription').textContent = task.description || 'Tidak ada deskripsi';
        document.getElementById('detailDueDate').textContent = task.dueDate ? `Deadline: ${this.formatDate(task.dueDate)}` : 'Tidak ada deadline';

        modal.dataset.currentTaskId = taskId;
        modal.classList.add('show');
    }

    editCurrentTask() {
        const taskId = document.getElementById('taskDetailModal').dataset.currentTaskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Populate form with current task data
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate;

        // Change form to edit mode
        const form = document.getElementById('taskForm');
        form.dataset.editMode = 'true';
        form.dataset.taskId = taskId;

        // Update modal title and button
        document.querySelector('#addTaskModal .modal-header h2').textContent = 'Edit Task';
        document.querySelector('#addTaskModal .btn-primary').textContent = 'Update Task';

        this.hideTaskDetailModal();
        this.showAddTaskModal();
    }

    deleteCurrentTask() {
        const taskId = document.getElementById('taskDetailModal').dataset.currentTaskId;
        if (confirm('Apakah Anda yakin ingin menghapus task ini?')) {
            this.deleteTask(taskId);
        }
    }

    // Modal Methods
    showAddTaskModal() {
        const modal = document.getElementById('addTaskModal');
        modal.classList.add('show');
        document.getElementById('taskTitle').focus();
    }

    hideAddTaskModal() {
        const modal = document.getElementById('addTaskModal');
        modal.classList.remove('show');
        document.getElementById('taskForm').reset();
        document.getElementById('taskForm').removeAttribute('data-edit-mode');
        document.getElementById('taskForm').removeAttribute('data-task-id');
        document.querySelector('#addTaskModal .modal-header h2').textContent = 'Tambah Task Baru';
        document.querySelector('#addTaskModal .btn-primary').textContent = 'Tambah Task';
    }

    hideTaskDetailModal() {
        const modal = document.getElementById('taskDetailModal');
        modal.classList.remove('show');
    }

    // Form Handling
    handleAddTask(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate')
        };

        if (e.target.dataset.editMode === 'true') {
            const taskId = e.target.dataset.taskId;
            this.updateTask(taskId, taskData);
            this.showNotification('Task berhasil diupdate!', 'success');
        } else {
            this.addTask(taskData);
        }
    }

    // Filter Methods
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTasks();
    }

    getFilteredTasks() {
        if (this.currentFilter === 'all') {
            return this.tasks;
        }
        return this.tasks.filter(task => task.status === this.currentFilter);
    }

    // Stats Methods
    updateStats() {
        const totalTasks = this.tasks.length;
        const pendingTasks = this.tasks.filter(task => task.status === 'pending').length;
        const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
        const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('productivityScore').textContent = `${productivityScore}%`;
    }

    updateColumnCounts() {
        const counts = {
            pending: this.tasks.filter(task => task.status === 'pending').length,
            'in-progress': this.tasks.filter(task => task.status === 'in-progress').length,
            completed: this.tasks.filter(task => task.status === 'completed').length
        };

        document.getElementById('todoCount').textContent = counts.pending;
        document.getElementById('inProgressCount').textContent = counts['in-progress'];
        document.getElementById('completedCount').textContent = counts.completed;
    }

    // Drag and Drop Methods
    initializeDragAndDrop() {
        const taskLists = document.querySelectorAll('.task-list');
        
        taskLists.forEach(list => {
            list.addEventListener('dragover', (e) => this.handleDragOver(e));
            list.addEventListener('drop', (e) => this.handleDrop(e));
            list.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            list.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    handleDragStart(e, taskId) {
        this.draggedTask = taskId;
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedTask = null;
        
        // Remove drag-over class from all lists
        document.querySelectorAll('.task-list').forEach(list => {
            list.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (this.draggedTask) {
            const newStatus = e.target.closest('.task-column').dataset.status;
            this.updateTask(this.draggedTask, { status: newStatus });
            this.showNotification(`Task dipindahkan ke ${newStatus === 'pending' ? 'To Do' : newStatus === 'in-progress' ? 'In Progress' : 'Completed'}!`, 'success');
        }
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Local Storage Methods
    saveTasks() {
        localStorage.setItem('taskflow-tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('taskflow-tasks');
        return saved ? JSON.parse(saved) : [];
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    // Add some sample tasks for demo only if no tasks exist
    if (taskManager.tasks.length === 0) {
        const sampleTasks = [
            {
                title: 'Setup Project Hackathon',
                description: 'Mempersiapkan struktur project dan environment untuk hackathon',
                priority: 'high',
                status: 'completed',
                dueDate: new Date().toISOString().split('T')[0]
            },
            {
                title: 'Design UI/UX',
                description: 'Membuat mockup dan design system untuk aplikasi',
                priority: 'high',
                status: 'in-progress',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            {
                title: 'Implementasi Backend API',
                description: 'Membuat API endpoints untuk CRUD operations',
                priority: 'medium',
                status: 'pending',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            {
                title: 'Testing & Debugging',
                description: 'Melakukan testing menyeluruh dan fix bugs',
                priority: 'medium',
                status: 'pending',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            {
                title: 'Documentation',
                description: 'Membuat dokumentasi API dan user guide',
                priority: 'low',
                status: 'pending',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
        ];

        sampleTasks.forEach(task => {
            taskManager.addTask(task);
        });
    }
    // Update header with saved profile info
    taskManager.updateHeaderProfile();
});
