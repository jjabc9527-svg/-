// 网站核心功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据
    let resources = JSON.parse(localStorage.getItem('resources')) || [];
    let currentView = 'grid';
    let currentFilter = 'all';
    let currentSort = 'newest';

    // DOM元素
    const resourceGrid = document.getElementById('resource-grid');
    const emptyState = document.getElementById('empty-state');
    const uploadModal = document.getElementById('upload-modal');
    const detailModal = document.getElementById('detail-modal');
    const uploadBtn = document.getElementById('upload-btn');
    const closeUploadBtn = document.getElementById('close-upload');
    const themeToggle = document.getElementById('theme-toggle');

    // 初始化
    updateStats();
    renderResources();
    setupEventListeners();

    function setupEventListeners() {
        // 分类筛选
        document.querySelectorAll('.category-list li').forEach(item => {
            item.addEventListener('click', function() {
                document.querySelector('.category-list li.active').classList.remove('active');
                this.classList.add('active');
                currentFilter = this.dataset.category;
                renderResources();
            });
        });

        // 搜索功能
        document.getElementById('search-input').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            filterResources(searchTerm);
        });

        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelector('.view-btn.active').classList.remove('active');
                this.classList.add('active');
                currentView = this.dataset.view;
                updateView();
            });
        });

        // 排序功能
        document.getElementById('sort-select').addEventListener('change', function(e) {
            currentSort = e.target.value;
            sortResources();
            renderResources();
        });

        // 主题切换
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const icon = this.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                localStorage.setItem('theme', 'dark');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
                localStorage.setItem('theme', 'light');
            }
        });

        // 上传功能
        uploadBtn.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
        });

        closeUploadBtn.addEventListener('click', () => {
            uploadModal.style.display = 'none';
        });

        // 关闭模态框（点击外部）
        window.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                uploadModal.style.display = 'none';
            }
            if (e.target === detailModal) {
                detailModal.style.display = 'none';
            }
        });

        // 标签点击
        document.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', function() {
                const tagText = this.textContent;
                document.getElementById('search-input').value = tagText;
                filterResources(tagText);
            });
        });

        // 检查保存的主题
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.querySelector('i').classList.remove('fa-moon');
            themeToggle.querySelector('i').classList.add('fa-sun');
        }
    }

    function updateStats() {
        const totalFiles = resources.length;
        const totalSize = resources.reduce((sum, res) => sum + (res.size || 0), 0);
        const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

        document.getElementById('total-files').textContent = totalFiles;
        document.getElementById('total-size').textContent = sizeInGB + ' GB';

        // 更新存储使用情况
        const usedStorageEl = document.getElementById('used-storage');
        const storageUsedEl = document.querySelector('.storage-used');

        if (usedStorageEl && storageUsedEl) {
            usedStorageEl.textContent = sizeInGB + ' GB';
            storageUsedEl.style.width = Math.min((sizeInGB / 10) * 100, 100) + '%';
        }
    }

    function renderResources() {
        let filteredResources = resources;

        // 应用筛选
        if (currentFilter !== 'all') {
            filteredResources = resources.filter(res => res.category === currentFilter);
        }

        // 应用排序
        filteredResources = sortFilteredResources(filteredResources);

        // 清空网格
        resourceGrid.innerHTML = '';

        // 显示/隐藏空状态
        if (filteredResources.length === 0) {
            emptyState.style.display = 'block';
            return;
        } else {
            emptyState.style.display = 'none';
        }

        // 生成资源卡片
        filteredResources.forEach(resource => {
            const card = createResourceCard(resource);
            resourceGrid.appendChild(card);
        });
    }

    function createResourceCard(resource) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.dataset.category = resource.category;
        card.dataset.tags = resource.tags.join(',');

        // 获取图标和颜色
        const categoryInfo = getCategoryInfo(resource.category);

        card.innerHTML = `
            <div class="card-header">
                <span class="card-category ${resource.category}" style="background: ${categoryInfo.color}">
                    ${categoryInfo.name}
                </span>
                <div class="card-actions">
                    <button class="action-btn" title="下载" onclick="downloadResource('${resource.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn" title="分享" onclick="shareResource('${resource.id}')">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
            <div class="card-preview">
                ${categoryInfo.icon}
                ${resource.thumbnail ? `<img src="${resource.thumbnail}" alt="${resource.name}">` : ''}
            </div>
            <div class="card-body">
                <h3 class="card-title">${resource.name}</h3>
                <p class="card-description">${resource.description || '暂无描述'}</p>
                <div class="card-meta">
                    <span><i class="far fa-clock"></i> ${formatDate(resource.date)}</span>
                    <span><i class="fas fa-weight-hanging"></i> ${formatFileSize(resource.size)}</span>
                </div>
                <div class="card-tags">
                    ${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        // 点击查看详情
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                showResourceDetail(resource);
            }
        });

        return card;
    }

    function getCategoryInfo(category) {
        const categories = {
            video: { name: '视频', icon: '<i class="fas fa-play-circle"></i>', color: '#ff6b6b' },
            image: { name: '图片', icon: '<i class="fas fa-image"></i>', color: '#4ecdc4' },
            software: { name: '软件', icon: '<i class="fas fa-download"></i>', color: '#ffd166' },
            document: { name: '文档', icon: '<i class="fas fa-file-alt"></i>', color: '#06d6a0' },
            audio: { name: '音频', icon: '<i class="fas fa-music"></i>', color: '#118ab2' },
            other: { name: '其他', icon: '<i class="fas fa-archive"></i>', color: '#9d4edd' }
        };

        return categories[category] || categories.other;
    }

    function filterResources(searchTerm) {
        const allCards = document.querySelectorAll('.resource-card');
        let hasVisibleCards = false;

        allCards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const desc = card.querySelector('.card-description').textContent.toLowerCase();
            const tags = card.dataset.tags.toLowerCase();

            if (title.includes(searchTerm) || desc.includes(searchTerm) || tags.includes(searchTerm)) {
                card.style.display = 'block';
                hasVisibleCards = true;
            } else {
                card.style.display = 'none';
            }
        });

        emptyState.style.display = hasVisibleCards ? 'none' : 'block';
    }

    function sortFilteredResources(filteredResources) {
        return filteredResources.sort((a, b) => {
            switch (currentSort) {
                case 'newest':
                    return new Date(b.date) - new Date(a.date);
                case 'oldest':
                    return new Date(a.date) - new Date(b.date);
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return (b.size || 0) - (a.size || 0);
                default:
                    return 0;
            }
        });
    }

    function sortResources() {
        resources = sortFilteredResources(resources);
        localStorage.setItem('resources', JSON.stringify(resources));
    }

    function updateView() {
        if (currentView === 'list') {
            resourceGrid.classList.add('list-view');
            resourceGrid.style.gridTemplateColumns = '1fr';
        } else {
            resourceGrid.classList.remove('list-view');
            resourceGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        }
    }

    function showResourceDetail(resource) {
        const categoryInfo = getCategoryInfo(resource.category);

        detailModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> 资源详情</h3>
                    <button class="close-btn" onclick="this.closest('.modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-header">
                        <div class="detail-category" style="background: ${categoryInfo.color}">
                            ${categoryInfo.icon} ${categoryInfo.name}
                        </div>
                        <h2>${resource.name}</h2>
                        <p class="detail-description">${resource.description || '暂无描述'}</p>
                    </div>
                    
                    <div class="detail-info">
                        <div class="info-row">
                            <span class="info-label">文件大小:</span>
                            <span class="info-value">${formatFileSize(resource.size)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">上传时间:</span>
                            <span class="info-value">${formatDate(resource.date)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">文件类型:</span>
                            <span class="info-value">${resource.type || '未知类型'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">下载次数:</span>
                            <span class="info-value">${resource.downloads || 0}</span>
                        </div>
                    </div>
                    
                    <div class="detail-tags">
                        <h4>标签</h4>
                        <div class="tags-container">
                            ${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn-secondary" onclick="this.closest('.modal').style.display='none'">
                            取消
                        </button>
                        <button class="btn-primary" onclick="downloadResource('${resource.id}')">
                            <i class="fas fa-download"></i> 下载文件
                        </button>
                        <button class="btn-primary" onclick="shareResource('${resource.id}')">
                            <i class="fas fa-share-alt"></i> 分享链接
                        </button>
                    </div>
                </div>
            </div>
        `;

        detailModal.style.display = 'flex';
    }

    // 工具函数
    window.formatDate = function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    window.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    window.downloadResource = function(resourceId) {
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
            // 更新下载次数
            resource.downloads = (resource.downloads || 0) + 1;
            localStorage.setItem('resources', JSON.stringify(resources));

            // 创建下载链接
            const link = document.createElement('a');
            link.href = resource.url || '#';
            link.download = resource.name;
            link.click();

            showNotification(`开始下载: ${resource.name}`);
        }
    };

    window.shareResource = function(resourceId) {
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
            const shareUrl = `${window.location.origin}/resource/${resourceId}`;

            if (navigator.share) {
                navigator.share({
                    title: resource.name,
                    text: resource.description,
                    url: shareUrl
                });
            } else {
                // 复制到剪贴板
                navigator.clipboard.writeText(shareUrl)
                    .then(() => showNotification('链接已复制到剪贴板'))
                    .catch(() => prompt('复制链接:', shareUrl));
            }
        }
    };

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 1rem 2rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 添加示例数据
    if (resources.length === 0) {
        resources = [
            {
                id: '1',
                name: 'Photoshop 2023 安装包.zip',
                category: 'software',
                size: 2.3 * 1024 * 1024 * 1024, // 2.3GB
                date: new Date().toISOString(),
                tags: ['设计', '软件', '工具'],
                description: 'Adobe Photoshop 2023 最新版本，包含激活工具',
                downloads: 124,
                type: 'ZIP压缩包'
            },
            {
                id: '2',
                name: 'React框架入门教程.mp4',
                category: 'video',
                size: 450 * 1024 * 1024, // 450MB
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                tags: ['教程', '编程', '前端'],
                description: 'React框架从入门到精通完整视频教程',
                downloads: 89,
                type: 'MP4视频'
            }
        ];
        localStorage.setItem('resources', JSON.stringify(resources));
        updateStats();
        renderResources();
    }
});