// 文件上传功能
document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files');
    const startUploadBtn = document.getElementById('start-upload');
    const cancelUploadBtn = document.getElementById('cancel-upload');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = uploadProgress.querySelector('.progress-fill');
    const progressText = uploadProgress.querySelector('.progress-text');

    let selectedFiles = [];

    // 选择文件
    selectFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // 拖放功能
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFileSelect({ target: { files: e.dataTransfer.files } });
    });

    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 上传功能
    startUploadBtn.addEventListener('click', startUpload);
    cancelUploadBtn.addEventListener('click', resetUploadForm);

    function handleFileSelect(e) {
        selectedFiles = Array.from(e.target.files);

        if (selectedFiles.length > 0) {
            // 显示选中的文件信息
            const fileList = selectedFiles.map(file => `
                <div class="file-item">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                    <span>(${formatFileSize(file.size)})</span>
                </div>
            `).join('');

            uploadZone.innerHTML = `
                <div class="selected-files">
                    ${fileList}
                </div>
                <button class="btn-secondary" onclick="resetFileSelection()">重新选择</button>
            `;

            startUploadBtn.disabled = false;
            updateFileInfo();
        }
    }

    window.resetFileSelection = function() {
        selectedFiles = [];
        fileInput.value = '';
        uploadZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt upload-icon"></i>
            <p>拖放文件到此处，或点击选择文件</p>
            <button class="btn-primary" id="select-files">选择文件</button>
        `;
        document.getElementById('select-files').addEventListener('click', () => fileInput.click());
        startUploadBtn.disabled = true;
    };

    function updateFileInfo() {
        if (selectedFiles.length > 0) {
            const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
            const name = selectedFiles[0].name.split('.')[0];

            document.getElementById('resource-name').value = name;
            document.getElementById('resource-category').value = getCategoryFromFile(selectedFiles[0]);
        }
    }

    function getCategoryFromFile(file) {
        const type = file.type;
        const extension = file.name.split('.').pop().toLowerCase();

        if (type.startsWith('video/')) return 'video';
        if (type.startsWith('image/')) return 'image';
        if (type.startsWith('audio/')) return 'audio';
        if (type.includes('pdf') || type.includes('document') || ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) return 'document';
        if (['exe', 'dmg', 'msi', 'apk', 'zip', 'rar'].includes(extension)) return 'software';
        return 'other';
    }

    async function startUpload() {
        if (selectedFiles.length === 0) return;

        const resource = {
            id: Date.now().toString(),
            name: document.getElementById('resource-name').value || selectedFiles[0].name,
            category: document.getElementById('resource-category').value,
            tags: document.getElementById('resource-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            description: document.getElementById('resource-desc').value,
            date: new Date().toISOString(),
            size: selectedFiles.reduce((sum, file) => sum + file.size, 0),
            type: selectedFiles[0].type || selectedFiles[0].name.split('.').pop(),
            downloads: 0
        };

        // 显示进度
        uploadProgress.style.display = 'block';
        startUploadBtn.disabled = true;

        // 模拟上传过程
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                uploadComplete(resource);
            }

            progressFill.style.width = progress + '%';
            progressText.textContent = `上传中... ${Math.round(progress)}%`;
        }, 200);

        // 保存文件引用（实际项目中应该上传到服务器）
        resource.url = URL.createObjectURL(selectedFiles[0]);

        // 如果是图片，生成缩略图
        if (selectedFiles[0].type.startsWith('image/')) {
            resource.thumbnail = await createThumbnail(selectedFiles[0]);
        }

        // 保存到本地存储
        const resources = JSON.parse(localStorage.getItem('resources')) || [];
        resources.push(resource);
        localStorage.setItem('resources', JSON.stringify(resources));

        function uploadComplete(resource) {
            progressText.textContent = '上传完成！';
            startUploadBtn.textContent = '完成';

            setTimeout(() => {
                // 关闭模态框
                document.getElementById('upload-modal').style.display = 'none';

                // 重置表单
                resetUploadForm();

                // 刷新资源列表
                window.location.reload();
            }, 1000);
        }
    }

    function resetUploadForm() {
        selectedFiles = [];
        fileInput.value = '';
        uploadZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt upload-icon"></i>
            <p>拖放文件到此处，或点击选择文件</p>
            <button class="btn-primary" id="select-files">选择文件</button>
        `;

        // 重置表单字段
        document.getElementById('resource-name').value = '';
        document.getElementById('resource-tags').value = '';
        document.getElementById('resource-desc').value = '';

        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '等待上传...';
        startUploadBtn.disabled = true;
        startUploadBtn.textContent = '开始上传';

        // 重新绑定事件
        document.getElementById('select-files').addEventListener('click', () => fileInput.click());
    }

    async function createThumbnail(file) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // 设置缩略图尺寸
                    const maxSize = 200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});