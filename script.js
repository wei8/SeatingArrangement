// 全局模态框函数
// 静态变量定义
const MIN_AUDIENCE_WIDTH = 1500; // 观众席最小宽度
const MIN_AUDIENCE_HEIGHT = 600; // 观众席最小高度

function showModal(message, title = '提示', type = 'info') {
    // 创建模态框元素
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // 设置图标和颜色基于类型
    let icon = 'ℹ️';
    let color = '#3498db';
    
    switch(type) {
        case 'success':
            icon = '✅';
            color = '#27ae60';
            break;
        case 'error':
            icon = '❌';
            color = '#e74c3c';
            break;
        case 'warning':
            icon = '⚠️';
            color = '#f39c12';
            break;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="width: 350px; text-align: center;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
            <h3 style="color: ${color}; margin-bottom: 1rem; margin-top: 0;">${title}</h3>
            <p style="margin-bottom: 1.5rem; color: #555; line-height: 1.5;">${message}</p>
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()" style="background: ${color}; border: none; padding: 0.5rem 1.5rem; border-radius: 5px; cursor: pointer; font-size: 0.9rem;">确定</button>
        </div>
    `;
    
    // 添加到body
    document.body.appendChild(modal);
    
    // 点击外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// 简化的消息显示函数
function showMessage(message, type = 'info') {
    showModal(message, type === 'error' ? '错误' : type === 'success' ? '成功' : '提示', type);
}

class SeatingArrangement {
    constructor() {
        this.tables = [];
        this.guests = [];
        this.selectedTable = null;
        this.draggedGuest = null;
        this.tableIdCounter = 1;
        this.guestIdCounter = 1;
        
        console.log('SeatingArrangement constructor started');
        this.initializeEventListeners();
        
        // 尝试从本地存储恢复数据
        console.log('开始初始化，尝试从本地存储恢复数据');
        if (this.loadFromLocalStorage()) {
            console.log('已从本地存储恢复数据');
            // 恢复数据后需要重新渲染客人列表
            this.updateGuestList();
            this.renderTables();
            this.updateTableList();
            console.log('数据恢复完成，准备调整画布大小');
        } else {
            console.log('没有缓存数据，使用默认数据');
            // 如果没有缓存数据，使用默认数据
            this.addDefaultTable();
            this.addTestGuests();
        }
        
        console.log('About to call adjustCanvasSize');
        this.adjustCanvasSize();
        console.log('About to call startAutoSave');
        this.startAutoSave();
        console.log('SeatingArrangement constructor completed');
    }
    
    initializeEventListeners() {
        // 控制按钮
        document.getElementById('addTableBtn').addEventListener('click', () => this.addTable());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetLayout());
        document.getElementById('adjustCanvasBtn').addEventListener('click', () => {
            console.log('Manual canvas adjustment triggered');
            this.adjustCanvasSize();
        });
        document.getElementById('addGuestBtn').addEventListener('click', () => this.addGuest());
        
        // 导入导出按钮事件
        document.getElementById('importGuestsBtn').addEventListener('click', () => this.importGuests());
        document.getElementById('exportGuestsBtn').addEventListener('click', () => this.exportGuests());
        document.getElementById('guestImportFile').addEventListener('change', (e) => this.handleFileImport(e));
        
        // 导出图片按钮事件
        document.getElementById('exportImageBtn').addEventListener('click', () => this.exportImage());
        
        // 调试渲染按钮事件
        document.getElementById('debugRenderBtn').addEventListener('click', () => this.debugRender());
        
        // 测试画布调整按钮事件
        document.getElementById('testCanvasBtn').addEventListener('click', () => this.testCanvasAdjustment());
        
        // 模态框
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('saveTableSettings').addEventListener('click', () => this.saveTableSettings());
        document.getElementById('deleteTable').addEventListener('click', () => this.deleteSelectedTable());
        
        // 回车添加客人
        document.getElementById('guestNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addGuest();
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }
    
    addDefaultTable() {
        console.log('addDefaultTable called');
        const position = this.calculateNextTablePosition();
        console.log('Calculated position:', position);
        
        const table = {
            id: this.tableIdCounter++,
            name: '主桌',
            seatCount: 12,
            x: position.x,
            y: position.y,
            guests: []
        };
        
        console.log('Created table:', table);
        this.tables.push(table);
        console.log('Tables array after push:', this.tables);
        
        this.renderTables();
        this.updateTableList();
        console.log('addDefaultTable completed');
    }
    
    addTable() {
        const position = this.calculateNextTablePosition();
        const table = {
            id: this.tableIdCounter++,
            name: `餐桌${this.tableIdCounter - 1}`,
            seatCount: 12,
            x: position.x,
            y: position.y,
            guests: []
        };
        this.tables.push(table);
        this.renderTables();
        this.updateTableList();
        this.adjustCanvasSize(); // 添加餐桌后调整画布大小
    }
    
    calculateNextTablePosition() {
        // 网格布局参数
        const tableWidth = 350; // 更新为新的餐桌宽度
        const tableHeight = 350; // 更新为新的餐桌高度
        const spacing = 80; // 餐桌间距
        const margin = 40; // 边距
        
        // 获取当前餐桌数量
        const tablesCount = this.tables.length;
        
        // N*N网格布局，计算网格大小
        const gridSize = Math.ceil(Math.sqrt(tablesCount + 1)); // 计算需要的网格大小
        
        // 计算行列位置
        const row = Math.floor(tablesCount / gridSize);
        const col = tablesCount % gridSize;
        
        // 计算位置，确保居中对齐
        const x = margin + col * (tableWidth + spacing);
        const y = margin + row * (tableHeight + spacing);
        
        return { x, y, gridSize };
    }
    
    adjustCanvasSize() {
        console.log('=== adjustCanvasSize called ===');
        const seatingArea = document.getElementById('seatingArea');
        console.log('seatingArea element:', seatingArea);
        console.log('Current tables:', this.tables);
        console.log('Tables count:', this.tables.length);
        
        if (!seatingArea) {
            console.error('seatingArea element not found in adjustCanvasSize!');
            return;
        }
        
        // 输出当前seatingArea的尺寸
        console.log('Current seatingArea styles:');
        console.log('  minWidth:', seatingArea.style.minWidth);
        console.log('  minHeight:', seatingArea.style.minHeight);
        console.log('  width:', seatingArea.style.width);
        console.log('  height:', seatingArea.style.height);
        
        if (this.tables.length === 0) {
            console.log('No tables exist, setting default size');
            seatingArea.style.minWidth = MIN_AUDIENCE_WIDTH + 'px';
            seatingArea.style.minHeight = MIN_AUDIENCE_HEIGHT + 'px';
            seatingArea.style.width = '800px';
            seatingArea.style.height = MIN_AUDIENCE_HEIGHT + 'px';
            console.log('Set default canvas size: 800x600px');
            return;
        }
        
        // 改进的画布调整逻辑 - 基于实际表格位置
        const tableWidth = 350; // 餐桌元素宽度
        const tableHeight = 350; // 餐桌元素高度
        const margin = 40; // 边距
        const extraMargin = 100; // 额外边距，确保有足够的空间
        
        // 计算所有表格的实际边界
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        console.log('Calculating table boundaries:');
        this.tables.forEach((table, index) => {
            console.log(`Table ${index}: x=${table.x}, y=${table.y}`);
            // 考虑表格的实际位置和尺寸
            minX = Math.min(minX, table.x);
            minY = Math.min(minY, table.y);
            maxX = Math.max(maxX, table.x + tableWidth);
            maxY = Math.max(maxY, table.y + tableHeight);
        });
        
        console.log(`Calculated boundaries: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
        
        // 计算需要的画布尺寸
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        console.log(`Content dimensions: width=${contentWidth}, height=${contentHeight}`);
        
        // 添加边距
        const neededWidth = contentWidth + margin * 2 + extraMargin;
        const neededHeight = contentHeight + margin * 2 + extraMargin;
        
        // 设置最小尺寸
        const minWidth = MIN_AUDIENCE_WIDTH;
        const minHeight = MIN_AUDIENCE_HEIGHT;
        
        const finalWidth = Math.max(minWidth, neededWidth);
        const finalHeight = Math.max(minHeight, neededHeight);
        
        console.log(`Final canvas size: ${finalWidth}x${finalHeight}px`);
        
        // 应用新的尺寸
        seatingArea.style.minWidth = finalWidth + 'px';
        seatingArea.style.minHeight = finalHeight + 'px';
        seatingArea.style.width = finalWidth + 'px';
        seatingArea.style.height = finalHeight + 'px';
        
        console.log('基于实际位置调整画布尺寸:');
        console.log('  内容边界:', { minX, minY, maxX, maxY });
        console.log('  内容尺寸:', contentWidth, 'x', contentHeight);
        console.log('  最终画布尺寸:', finalWidth, 'x', finalHeight);
        
        // 在页面上显示当前尺寸（调试用）
        this.updateCanvasSizeDisplay(finalWidth, finalHeight);
        
        // 添加视觉反馈
        if (finalWidth > minWidth || finalHeight > minHeight) {
            seatingArea.classList.add('expanded');
            setTimeout(() => {
                seatingArea.classList.remove('expanded');
            }, 300);
        }
        
        console.log('adjustCanvasSize completed');
    }
    
    // 显示当前画布尺寸的调试方法
    updateCanvasSizeDisplay(width, height) {
        // 移除旧的尺寸显示
        const oldDisplay = document.getElementById('canvasSizeDisplay');
        if (oldDisplay) {
            oldDisplay.remove();
        }
        
        // 创建新的尺寸显示
        const sizeDisplay = document.createElement('div');
        sizeDisplay.id = 'canvasSizeDisplay';
        sizeDisplay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        sizeDisplay.innerHTML = `
            <div>画布尺寸: ${width} × ${height}</div>
            <div>表格数量: ${this.tables.length}</div>
            <div>更新时间: ${new Date().toLocaleTimeString()}</div>
        `;
        
        document.body.appendChild(sizeDisplay);
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (sizeDisplay.parentNode) {
                sizeDisplay.parentNode.removeChild(sizeDisplay);
            }
        }, 5000);
    }
    
    deleteTable(tableId) {
        this.tables = this.tables.filter(table => table.id !== tableId);
        this.renderTables();
        this.updateTableList();
        this.adjustCanvasSize(); // 删除餐桌后调整画布大小
    }
    
    deleteSelectedTable() {
        if (this.selectedTable) {
            this.deleteTable(this.selectedTable.id);
            this.selectedTable = null;
            this.closeModal();
        }
    }
    
    resetLayout() {
        if (confirm('确定要重置所有布局吗？这将清除所有餐桌和客人安排。')) {
            this.tables = [];
            this.guests = [];
            this.selectedTable = null;
            this.tableIdCounter = 1;
            this.guestIdCounter = 1;
            this.renderTables();
            this.updateTableList();
            this.updateGuestList();
            this.addDefaultTable(); // 使用新的布局算法添加默认餐桌
            this.adjustCanvasSize(); // 重置后调整画布大小
            this.clearLocalStorage(); // 清除本地存储
        }
    }
    
    addGuest() {
        const nameInput = document.getElementById('guestNameInput');
        const positionInput = document.getElementById('guestPositionInput');
        const companyInput = document.getElementById('guestCompanyInput');
        
        const name = nameInput.value.trim();
        const position = positionInput.value.trim();
        const company = companyInput.value.trim();
        
        if (name) {
            const guest = {
                id: this.guestIdCounter++,
                name: name,
                position: position, // 职务
                company: company, // 公司
                tableId: null,
                seatNumber: null
            };
            this.guests.push(guest);
            
            // 清空输入框
            nameInput.value = '';
            positionInput.value = '';
            companyInput.value = '';
            
            this.updateGuestList();
        }
    }
    
    editGuest(guest) {
        // 创建编辑模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <span class="close">&times;</span>
                <h3>编辑客人信息</h3>
                <div class="form-group">
                    <label for="editGuestName">客人姓名:</label>
                    <input type="text" id="editGuestName" value="${guest.name}" placeholder="请输入客人姓名">
                </div>
                <div class="form-group">
                    <label for="editGuestPosition">职务:</label>
                    <input type="text" id="editGuestPosition" value="${guest.position || ''}" placeholder="请输入职务">
                </div>
                <div class="form-group">
                    <label for="editGuestCompany">公司:</label>
                    <input type="text" id="editGuestCompany" value="${guest.company || ''}" placeholder="请输入公司">
                </div>
                <div class="modal-buttons">
                    <button id="saveGuestEdit" class="btn btn-primary">保存</button>
                    <button id="cancelGuestEdit" class="btn btn-secondary">取消</button>
                    <button id="deleteGuestInModal" class="btn btn-danger" style="margin-left: auto; background: #dc3545;">删除客人</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 保存按钮事件
        modal.querySelector('#saveGuestEdit').addEventListener('click', () => {
            const newName = modal.querySelector('#editGuestName').value.trim();
            const newPosition = modal.querySelector('#editGuestPosition').value.trim();
            const newCompany = modal.querySelector('#editGuestCompany').value.trim();
            
            if (newName) {
                // 更新客人信息
                guest.name = newName;
                guest.position = newPosition;
                guest.company = newCompany;
                
                // 重新渲染
                this.renderTables();
                this.updateGuestList();
                
                // 关闭模态框
                document.body.removeChild(modal);
            } else {
                showMessage('客人姓名不能为空！', 'error');
            }
        });
        
        // 取消按钮事件
        modal.querySelector('#cancelGuestEdit').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 删除按钮事件
        modal.querySelector('#deleteGuestInModal').addEventListener('click', () => {
            const confirmDelete = confirm(`确定要删除客人「${guest.name}」吗？`);
            if (confirmDelete) {
                // 关闭编辑模态框
                document.body.removeChild(modal);
                // 执行删除操作
                this.deleteGuest(guest.id);
            }
        });
        
        // 关闭按钮事件
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    deleteGuest(guestId) {
        const guest = this.guests.find(g => g.id === guestId);
        if (!guest) return;
        
        // 确认删除
        const confirmDelete = confirm(`确定要删除客人「${guest.name}」吗？`);
        if (!confirmDelete) return;
        
        // 如果客人在座位上，先从座位上移除
        if (guest.tableId) {
            this.removeGuestFromSeat(guest);
        }
        
        // 从客人列表中删除
        this.guests = this.guests.filter(g => g.id !== guestId);
        
        // 重新渲染
        this.updateGuestList();
    }
    
    renderTables() {
        const seatingArea = document.getElementById('seatingArea');
        console.log('renderTables called, seatingArea:', seatingArea);
        console.log('tables data:', this.tables);
        
        if (!seatingArea) {
            console.error('seatingArea element not found!');
            return;
        }
        
        // 确保seatingArea可见
        seatingArea.style.display = 'flex';
        seatingArea.style.visibility = 'visible';
        seatingArea.style.opacity = '1';
        
        seatingArea.innerHTML = '';
        
        this.tables.forEach(table => {
            const tableElement = this.createTableElement(table);
            seatingArea.appendChild(tableElement);
        });
        
        console.log(`Rendered ${this.tables.length} tables`);
        
        // 强制浏览器重绘
        seatingArea.offsetHeight;
        
        // 检查渲染后的状态
        console.log('After rendering, seatingArea children:', seatingArea.children.length);
        console.log('After rendering, seatingArea display:', getComputedStyle(seatingArea).display);
    }
    
    createTableElement(table) {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table';
        tableDiv.style.position = 'absolute';
        tableDiv.style.left = table.x + 'px';
        tableDiv.style.top = table.y + 'px';
        tableDiv.dataset.tableId = table.id;
        
        // 餐桌圆形
        const tableCircle = document.createElement('div');
        tableCircle.className = 'table-circle';
        tableCircle.textContent = table.name;
        tableDiv.appendChild(tableCircle);
        
        // 创建座位
        this.createSeats(tableDiv, table);
        
        // 拖拽功能
        this.makeTableDraggable(tableDiv, table);
        
        // 点击选中
        tableDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('seat')) {
                this.selectTable(table);
            }
        });
        
        // 双击打开设置
        tableDiv.addEventListener('dblclick', () => {
            this.openTableSettings(table);
        });
        
        return tableDiv;
    }
    
    createSeats(tableDiv, table) {
        const seatCount = table.seatCount;
        const radius = 145; // 调整座位距离，使座位与圆桌间距更合理（圆桌半径120，间距25px）
        
        for (let i = 0; i < seatCount; i++) {
            const angle = (i * 2 * Math.PI) / seatCount - Math.PI / 2; // 从顶部开始
            const x = Math.cos(angle) * radius + 175; // 175是餐桌中心位置（350px方框的中心）
            const y = Math.sin(angle) * radius + 175;
            
            const seat = document.createElement('div');
            seat.className = 'seat';
            seat.style.left = (x - 25) + 'px'; // 25是座位半径（座位现在是50px）
            seat.style.top = (y - 25) + 'px';
            seat.textContent = i + 1;
            seat.dataset.seatNumber = i + 1;
            seat.dataset.tableId = table.id;
            seat.textContent = i + 1;
            seat.dataset.seatNumber = i + 1;
            seat.dataset.tableId = table.id;
            
            // 检查是否有客人坐在这里
            const guest = table.guests.find(g => g.seatNumber === i + 1);
            if (guest) {
                seat.classList.add('occupied');
                seat.textContent = guest.name; // 只显示姓名
                
                // 构建完整的提示信息
                let tooltip = guest.name;
                if (guest.position || guest.company) {
                    tooltip += '\n';
                    if (guest.position) tooltip += `职务: ${guest.position}`;
                    if (guest.position && guest.company) tooltip += '\n';
                    if (guest.company) tooltip += `公司: ${guest.company}`;
                }
                seat.title = tooltip;
            }
            
            // 拖放功能
            this.makeSeatDroppable(seat, table, i + 1);
            
            tableDiv.appendChild(seat);
        }
    }
    
    makeTableDraggable(tableDiv, table) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        tableDiv.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('seat')) return;
            if (e.target.closest('.seat')) return; // 如果点击的是座位或其子元素，不触发餐桌拖拽
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = table.x;
            initialY = table.y;
            
            tableDiv.style.cursor = 'grabbing';
            tableDiv.style.zIndex = '1000';
            
            // 添加拖拽样式
            tableDiv.classList.add('dragging');
            
            // 创建拖拽预览
            const dragPreview = tableDiv.cloneNode(true);
            dragPreview.style.opacity = '0.7';
            dragPreview.style.transform = 'rotate(5deg) scale(1.1)';
            document.body.appendChild(dragPreview);
            dragPreview.style.position = 'absolute';
            dragPreview.style.top = '-1000px';
            dragPreview.style.left = '-1000px';
            
            // 设置拖拽预览（用于后续可能的dragstart事件）
            tableDiv._dragPreview = dragPreview;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            table.x = initialX + deltaX;
            table.y = initialY + deltaY;
            
            tableDiv.style.left = table.x + 'px';
            tableDiv.style.top = table.y + 'px';
        });
        
        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                tableDiv.style.cursor = 'move';
                tableDiv.style.zIndex = 'auto';
                tableDiv.classList.remove('dragging');
                
                // 清理拖拽预览
                if (tableDiv._dragPreview) {
                    document.body.removeChild(tableDiv._dragPreview);
                    delete tableDiv._dragPreview;
                }
                
                // 拖拽结束时对齐到网格
                this.snapTableToGrid(tableDiv, table);
                this.checkAndExpandCanvas(e);
                
                // 显示对齐提示
                this.showSnapFeedback(tableDiv);
            }
        });
    }
    
    snapTableToGrid(tableDiv, table) {
        const gridSize = 20; // 网格大小
        
        // 对齐到网格
        const snappedX = Math.round(table.x / gridSize) * gridSize;
        const snappedY = Math.round(table.y / gridSize) * gridSize;
        
        table.x = snappedX;
        table.y = snappedY;
        
        tableDiv.style.left = snappedX + 'px';
        tableDiv.style.top = snappedY + 'px';
    }
    
    makeSeatDroppable(seat, table, seatNumber) {
        seat.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedGuest) {
                seat.classList.add('drag-over');
            }
        });
        
        seat.addEventListener('dragleave', () => {
            seat.classList.remove('drag-over');
        });
        
        seat.addEventListener('drop', (e) => {
            e.preventDefault();
            seat.classList.remove('drag-over');
            
            if (this.draggedGuest) {
                this.assignGuestToSeat(this.draggedGuest, table, seatNumber);
            }
        });
        
        // 长按拖拽功能已移除
        
        // 双击座位进入编辑状态
        seat.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.editSeat(table, seatNumber);
        });
        
        // 长按提示功能已移除
        
        // 单击座位显示信息（不移除客人）
        seat.addEventListener('click', (e) => {
            e.stopPropagation();
            const guest = table.guests.find(g => g.seatNumber === seatNumber);
            if (guest) {
                // 显示客人信息，不执行删除操作
                console.log(`座位 ${seatNumber}: ${guest.name} (${guest.position || '无职务'} - ${guest.company || '无公司'})`);
            }
        });
    }
    
    assignGuestToSeat(guest, table, seatNumber) {
        // 如果客人已经在其他座位，先移除
        if (guest.tableId) {
            this.removeGuestFromSeat(guest);
        }
        
        // 如果座位已被占用，先移除原客人
        const existingGuest = table.guests.find(g => g.seatNumber === seatNumber);
        if (existingGuest) {
            this.removeGuestFromSeat(existingGuest);
        }
        
        // 分配新座位
        guest.tableId = table.id;
        guest.seatNumber = seatNumber;
        table.guests.push(guest);
        
        this.renderTables();
        this.updateGuestList();
    }
    
    editSeat(table, seatNumber) {
        const currentGuest = table.guests.find(g => g.seatNumber === seatNumber);
        
        // 添加编辑状态的视觉反馈
        const seatElement = document.querySelector(`[data-table-id="${table.id}"] [data-seat-number="${seatNumber}"]`);
        if (seatElement) {
            seatElement.classList.add('editing');
        }
        
        // 创建编辑模态框
        const modal = document.createElement('div');
        modal.className = 'seat-edit-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 400px;
            width: 90%;
        `;
        
        let modalHTML = `
            <h3>编辑座位 ${seatNumber}</h3>
            <div style="margin: 1rem 0;">
        `;
        
        if (currentGuest) {
            modalHTML += `
                <p><strong>当前客人:</strong> ${currentGuest.name}</p>
                <p><small>${currentGuest.position || '无职务'} - ${currentGuest.company || '无公司'}</small></p>
                <button onclick="window.seatingApp.removeGuestFromSeat(window.seatingApp.guests.find(g => g.id === ${currentGuest.id})); this.closest('.seat-edit-modal').remove();" class="btn btn-danger" style="margin: 0.5rem 0;">删除当前客人</button>
                <hr>
            `;
        }
        
        modalHTML += `
                <label for="guestSelect">选择客人:</label>
                <select id="guestSelect" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0;">
                    <option value="">-- 选择客人 --</option>
        `;
        
        // 添加可用客人选项
        const availableGuests = this.guests.filter(g => !g.tableId);
        availableGuests.forEach(guest => {
            modalHTML += `<option value="${guest.id}">${guest.name} (${guest.position || '无职务'} - ${guest.company || '无公司'})</option>`;
        });
        
        modalHTML += `
                </select>
            </div>
            <div style="text-align: right; margin-top: 1rem;">
                <button onclick="this.closest('.seat-edit-modal').remove()" class="btn btn-secondary">取消</button>
                <button onclick="window.seatingApp.saveSeatEdit(${table.id}, ${seatNumber})" class="btn btn-primary">确定</button>
            </div>
        `;
        
        content.innerHTML = modalHTML;
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // 保存引用以便全局访问
        window.seatingApp = this;
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                // 移除编辑状态的视觉反馈
                if (seatElement) {
                    seatElement.classList.remove('editing');
                }
            }
        });
        
        // 监听确定和取消按钮的点击事件来移除编辑状态
        const removeEditingState = () => {
            if (seatElement) {
                seatElement.classList.remove('editing');
            }
        };
        
        // 为确定和取消按钮添加事件监听器
        setTimeout(() => {
            const cancelBtn = content.querySelector('.btn-secondary');
            const confirmBtn = content.querySelector('.btn-primary');
            if (cancelBtn) cancelBtn.addEventListener('click', removeEditingState);
            if (confirmBtn) confirmBtn.addEventListener('click', removeEditingState);
        }, 100);
    }
    
    saveSeatEdit(tableId, seatNumber) {
        const select = document.getElementById('guestSelect');
        const guestId = select.value;
        
        if (guestId) {
            const guest = this.guests.find(g => g.id == guestId);
            const table = this.tables.find(t => t.id == tableId);
            if (guest && table) {
                this.assignGuestToSeat(guest, table, seatNumber);
            }
        }
        
        // 关闭模态框
        const modal = document.querySelector('.seat-edit-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    removeGuestFromSeat(guest) {
        if (!guest) {
            console.warn('removeGuestFromSeat: 客人对象为空');
            return;
        }
        
        console.log(`移除客人: ${guest.name} (ID: ${guest.id}) 从餐桌 ${guest.tableId} 座位 ${guest.seatNumber}`);
        
        const table = this.tables.find(t => t.id === guest.tableId);
        if (table) {
            const originalGuestCount = table.guests.length;
            table.guests = table.guests.filter(g => g.id !== guest.id);
            console.log(`餐桌 ${table.name} 客人数量: ${originalGuestCount} -> ${table.guests.length}`);
        } else {
            console.warn(`未找到餐桌 ID: ${guest.tableId}`);
        }
        
        // 清除客人的座位信息
        guest.tableId = null;
        guest.seatNumber = null;
        
        // 强制重新渲染餐桌和客人列表
        this.renderTables();
        this.updateGuestList();
        
        console.log('客人列表状态已更新');
        
        // 验证数据一致性
        this.validateGuestData();
    }
    
    // 拖拽反馈功能已移除
    
    selectTable(table) {
        this.selectedTable = table;
        
        // 更新选中状态
        document.querySelectorAll('.table').forEach(tableEl => {
            tableEl.classList.remove('selected');
        });
        
        const tableElement = document.querySelector(`[data-table-id="${table.id}"]`);
        if (tableElement) {
            tableElement.classList.add('selected');
        }
        
        this.updateTableList();
    }
    
    openTableSettings(table) {
        this.selectedTable = table;
        document.getElementById('tableNameInput').value = table.name;
        document.getElementById('seatCountInput').value = table.seatCount;
        document.getElementById('tableSettingsModal').style.display = 'block';
    }
    
    saveTableSettings() {
        if (this.selectedTable) {
            const newName = document.getElementById('tableNameInput').value.trim();
            const newSeatCount = parseInt(document.getElementById('seatCountInput').value);
            
            if (newName && newSeatCount >= 4 && newSeatCount <= 20) {
                this.selectedTable.name = newName;
                
                // 如果座位数量改变，需要重新安排客人
                if (newSeatCount !== this.selectedTable.seatCount) {
                    // 移除超出新座位数量的客人
                    if (newSeatCount < this.selectedTable.seatCount) {
                        this.selectedTable.guests = this.selectedTable.guests.filter(
                            g => g.seatNumber <= newSeatCount
                        );
                    }
                    this.selectedTable.seatCount = newSeatCount;
                }
                
                this.renderTables();
                this.updateTableList();
                this.closeModal();
            }
        }
    }
    
    closeModal() {
        document.getElementById('tableSettingsModal').style.display = 'none';
    }
    
    updateTableList() {
        const tableList = document.getElementById('tableList');
        tableList.innerHTML = '';
        
        this.tables.forEach(table => {
            const tableItem = document.createElement('div');
            tableItem.className = 'table-item';
            if (this.selectedTable && this.selectedTable.id === table.id) {
                tableItem.classList.add('active');
            }
            
            tableItem.innerHTML = `
                <strong>${table.name}</strong><br>
                <small>座位: ${table.seatCount} | 已安排: ${table.guests.length}</small>
            `;
            
            tableItem.addEventListener('click', () => {
                this.selectTable(table);
            });
            
            tableList.appendChild(tableItem);
        });
    }
    
    updateGuestList() {
        const guestList = document.getElementById('guestList');
        if (!guestList) {
            console.error('updateGuestList: 找不到guestList元素');
            return;
        }
        
        console.log(`更新客人列表，共 ${this.guests.length} 位客人`);
        guestList.innerHTML = '';
        
        this.guests.forEach(guest => {
            const guestItem = document.createElement('div');
            guestItem.className = 'guest-item';
            guestItem.draggable = true;
            guestItem.dataset.guestId = guest.id;
            
            let statusText = '';
            let backgroundColor = '';
            
            if (guest.tableId) {
                const table = this.tables.find(t => t.id === guest.tableId);
                if (table) {
                    statusText = ` (${table.name} - ${guest.seatNumber}号座位)`;
                    backgroundColor = '#d4edda';
                    console.log(`客人 ${guest.name} 已分配到 ${table.name} ${guest.seatNumber}号座位`);
                } else {
                    console.warn(`客人 ${guest.name} 引用了不存在的餐桌 ID: ${guest.tableId}`);
                    // 清理无效的引用
                    guest.tableId = null;
                    guest.seatNumber = null;
                }
            } else {
                console.log(`客人 ${guest.name} 未分配座位`);
            }
            
            if (backgroundColor) {
                guestItem.style.background = backgroundColor;
            }
            
            guestItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; min-height: 50px;">
                    <div class="guest-info">
                        <div class="guest-name">${guest.name}</div>
                        <div class="guest-details">
                            ${guest.position ? guest.position : ''}${guest.position && guest.company ? ' - ' : ''}${guest.company ? guest.company : ''}
                        </div>
                        ${statusText ? `<div class="guest-status">${statusText}</div>` : ''}
                    </div>
                </div>
            `;
            
            // 拖拽事件
            guestItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', guestItem.innerHTML);
                guestItem.style.opacity = '0.5';
                this.draggedGuest = guest;
                guestItem.classList.add('dragging');
            });

            guestItem.addEventListener('dragend', (e) => {
                guestItem.style.opacity = '1';
                guestItem.classList.remove('dragging');
                this.draggedGuest = null;
                this.checkAndExpandCanvas(e);
            });

            // 拖拽过程中的画布扩展检测
            guestItem.addEventListener('drag', (e) => {
                if (this.draggedGuest) {
                    this.checkDragArea(e);
                }
            });
            
            // 双击编辑
            guestItem.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                // 如果客人在座位上，先移除座位分配
                if (guest.tableId) {
                    this.removeGuestFromSeat(guest);
                }
                // 进入编辑模式
                this.editGuest(guest);
            });
            
            // 单击事件（可以保留用于其他功能）
            guestItem.addEventListener('click', (e) => {
                e.stopPropagation();
                // 这里可以添加其他单击功能，比如选中效果等
            });
            
            guestList.appendChild(guestItem);
        });
    }

    // 检查拖拽区域并扩展画布
    checkDragArea(e) {
        const seatingArea = document.querySelector('.seating-area');
        const rect = seatingArea.getBoundingClientRect();
        const dragX = e.clientX;
        const dragY = e.clientY;
        
        // 定义拖拽扩展区域（距离边缘50px）
        const expandThreshold = 50;
        let needExpand = false;
        let expandWidth = 0;
        let expandHeight = 0;
        
        // 检查右侧扩展
        if (dragX > rect.right - expandThreshold && dragX < rect.right + expandThreshold) {
            expandWidth = 200; // 扩展200px
            needExpand = true;
        }
        
        // 检查底部扩展
        if (dragY > rect.bottom - expandThreshold && dragY < rect.bottom + expandThreshold) {
            expandHeight = 200; // 扩展200px
            needExpand = true;
        }
        
        if (needExpand) {
            this.expandCanvas(expandWidth, expandHeight);
        }
    }

    // 扩展画布尺寸
    expandCanvas(additionalWidth, additionalHeight) {
        const seatingArea = document.querySelector('.seating-area');
        const currentWidth = parseInt(seatingArea.style.width) || seatingArea.offsetWidth;
        const currentHeight = parseInt(seatingArea.style.height) || seatingArea.offsetHeight;
        
        const newWidth = currentWidth + additionalWidth;
        const newHeight = currentHeight + additionalHeight;
        
        // 应用新的尺寸
        seatingArea.style.width = newWidth + 'px';
        seatingArea.style.height = newHeight + 'px';
        
        // 添加扩展动画效果
        seatingArea.classList.add('expanding');
        setTimeout(() => seatingArea.classList.remove('expanding'), 500);
        
        console.log(`画布已扩展：宽度 ${currentWidth}→${newWidth}px，高度 ${currentHeight}→${newHeight}px`);
    }

    // 拖拽结束时检查是否需要调整画布
    checkAndExpandCanvas(e) {
        if (!e || !e.clientX || !e.clientY) return;
        
        const seatingArea = document.querySelector('.seating-area');
        const rect = seatingArea.getBoundingClientRect();
        const tables = document.querySelectorAll('.table');
        
        // 找到最远的餐桌位置
        let maxRight = 0;
        let maxBottom = 0;
        
        tables.forEach(table => {
            const tableRect = table.getBoundingClientRect();
            maxRight = Math.max(maxRight, tableRect.right - rect.left);
            maxBottom = Math.max(maxBottom, tableRect.bottom - rect.top);
        });
        
        // 计算需要的额外空间（预留100px边距）
        const currentWidth = parseInt(seatingArea.style.width) || seatingArea.offsetWidth;
        const currentHeight = parseInt(seatingArea.style.height) || seatingArea.offsetHeight;
        
        const neededWidth = Math.max(currentWidth, maxRight + 100);
        const neededHeight = Math.max(currentHeight, maxBottom + 100);
        
        if (neededWidth > currentWidth || neededHeight > currentHeight) {
            seatingArea.style.width = neededWidth + 'px';
            seatingArea.style.height = neededHeight + 'px';
            
            seatingArea.classList.add('expanded');
            setTimeout(() => seatingArea.classList.remove('expanded'), 300);
        }
    }

    // 显示对齐反馈
    showSnapFeedback(tableElement) {
        // 创建反馈元素
        const feedback = document.createElement('div');
        feedback.innerHTML = '✓ 已对齐到网格';
        feedback.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 2000;
            animation: snapFade 1.5s ease-out forwards;
        `;
        
        // 添加动画样式
        if (!document.getElementById('snapAnimation')) {
            const style = document.createElement('style');
            style.id = 'snapAnimation';
            style.textContent = `
                @keyframes snapFade {
                    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        tableElement.appendChild(feedback);
        
        // 1.5秒后移除反馈
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1500);
        
        // 添加短暂的高亮效果
        tableElement.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.6)';
        setTimeout(() => {
            tableElement.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        }, 500);
    }
    
    addTestGuests() {
        // 添加测试客人数据
        const testGuests = [
            { name: '张三', position: '总经理', company: '科技有限公司' },
            { name: '李四', position: '市场总监', company: '创新企业' },
            { name: '王五', position: '技术经理', company: '互联网科技' },
            { name: '赵六', position: '财务主管', company: '投资咨询' },
            { name: '钱七', position: '人事经理', company: '人力资源' },
            { name: '孙八', position: '销售总监', company: '贸易公司' }
        ];
        
        testGuests.forEach(guestData => {
            const guest = {
                id: this.guestIdCounter++,
                name: guestData.name,
                position: guestData.position,
                company: guestData.company,
                tableId: null,
                seatNumber: null
            };
            this.guests.push(guest);
        });
        
        this.updateGuestList();
    }
    
    importGuests() {
        document.getElementById('guestImportFile').click();
    }
    
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let guestsData;
                
                // 根据文件扩展名判断格式
                if (file.name.toLowerCase().endsWith('.json')) {
                    guestsData = JSON.parse(content);
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    guestsData = this.parseCSV(content);
                } else {
                    showMessage('不支持的文件格式！请上传JSON或CSV文件。', 'error');
                    return;
                }
                
                // 验证数据格式
                if (!this.validateGuestData(guestsData)) {
                    showMessage('数据格式错误！请确保包含姓名字段。', 'error');
                    return;
                }
                
                // 确认导入
                if (confirm(`确定要导入 ${guestsData.length} 位客人信息吗？这将覆盖现有的所有客人信息。`)) {
                    this.importGuestData(guestsData);
                    showMessage('客人信息导入成功！', 'success');
                }
                
            } catch (error) {
                showMessage('文件解析失败：' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
        // 清空文件输入，允许重复导入同一文件
        event.target.value = '';
    }
    
    parseCSV(content) {
        const lines = content.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // 支持的字段映射
        const fieldMap = {
            'name': ['name', '姓名', 'name', '客人姓名'],
            'position': ['position', '职务', '职位', 'title'],
            'company': ['company', '公司', '单位', 'organization']
        };
        
        // 找到对应的字段索引
        const fieldIndexes = {};
        Object.keys(fieldMap).forEach(key => {
            fieldIndexes[key] = headers.findIndex(h => fieldMap[key].includes(h.toLowerCase()));
        });
        
        // 验证必要字段
        if (fieldIndexes.name === -1) {
            throw new Error('CSV文件必须包含姓名字段');
        }
        
        const guests = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const guest = {
                name: values[fieldIndexes.name] || '',
                position: fieldIndexes.position !== -1 ? values[fieldIndexes.position] || '' : '',
                company: fieldIndexes.company !== -1 ? values[fieldIndexes.company] || '' : ''
            };
            
            if (guest.name) { // 只导入有姓名的客人
                guests.push(guest);
            }
        }
        
        return guests;
    }
    
    validateGuestData(guestsData) {
        if (!Array.isArray(guestsData) || guestsData.length === 0) {
            return false;
        }
        
        // 检查每个客人是否有姓名
        return guestsData.every(guest => guest && guest.name && guest.name.trim() !== '');
    }
    
    importGuestData(guestsData) {
        // 清空现有客人数据
        this.guests = [];
        
        // 重新生成客人ID并导入数据
        guestsData.forEach(guestData => {
            const guest = {
                id: this.guestIdCounter++,
                name: guestData.name.trim(),
                position: guestData.position ? guestData.position.trim() : '',
                company: guestData.company ? guestData.company.trim() : '',
                tableId: null,
                seatNumber: null
            };
            this.guests.push(guest);
        });
        
        // 重新渲染界面
        this.renderTables();
        this.updateGuestList();
    }
    
    exportGuests() {
        // 准备CSV格式的数据
        const csvHeaders = ['姓名', '职位', '公司'];
        const csvRows = this.guests.map(guest => [
            guest.name,
            guest.position,
            guest.company
        ]);
        
        // 构建CSV内容（使用UTF-8 BOM确保中文正常显示）
        const csvContent = '\uFEFF' + csvHeaders.join(',') + '\n' + 
            csvRows.map(row => 
                row.map(field => {
                    // 处理包含逗号或引号的字段
                    const fieldStr = String(field || '');
                    if (fieldStr.includes(',') || fieldStr.includes('"')) {
                        return '"' + fieldStr.replace(/"/g, '""') + '"';
                    }
                    return fieldStr;
                }).join(',')
            ).join('\n');
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `客人名单_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    exportImage() {
        if (this.tables.length === 0) {
            showMessage('没有餐桌可以导出！请先添加一些餐桌。', 'warning');
            return;
        }
        
        try {
            // 获取seatingArea元素
            const seatingArea = document.getElementById('seatingArea');
            if (!seatingArea) {
                showMessage('找不到座位区域！', 'error');
                return;
            }
            
            // 创建临时画布
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // 获取所有餐桌的实际边界
            const bounds = this.getCanvasBounds();
            
            // 设置边距和标题高度
            const padding = 60;
            const titleHeight = 80;
            const cornerRadius = 10;
            
            // 设置画布尺寸（增加底部区域高度避免文字重叠）
            tempCanvas.width = bounds.width + padding * 2;
            tempCanvas.height = bounds.height + padding * 2 + titleHeight + 80; // 增加80像素底部空间，确保文字不贴边
            
            // 绘制背景（圆角矩形）
            tempCtx.fillStyle = '#ffffff';
            this.roundRect(tempCtx, 0, 0, tempCanvas.width, tempCanvas.height, cornerRadius);
            tempCtx.fill();
            
            // 绘制标题
            tempCtx.fillStyle = '#2c3e50';
            tempCtx.font = 'bold 24px Microsoft YaHei, Arial, sans-serif';
            tempCtx.textAlign = 'center';
            tempCtx.fillText('座位安排图', tempCanvas.width / 2, 35);
            
            // 绘制副标题（日期）
            tempCtx.fillStyle = '#7f8c8d';
            tempCtx.font = '14px Microsoft YaHei, Arial, sans-serif';
            const today = new Date().toLocaleDateString('zh-CN');
            tempCtx.fillText(`导出日期：${today}`, tempCanvas.width / 2, 60);
            
            // 绘制分隔线
            tempCtx.strokeStyle = '#e0e0e0';
            tempCtx.lineWidth = 1;
            tempCtx.beginPath();
            tempCtx.moveTo(padding, tempCanvas.height - 80);
            tempCtx.lineTo(tempCanvas.width - padding, tempCanvas.height - 80);
            tempCtx.stroke();
            
            // 绘制统计信息（调整到更合适的位置）
            tempCtx.fillStyle = '#34495e';
            tempCtx.font = '12px Microsoft YaHei, Arial, sans-serif';
            tempCtx.textAlign = 'left';
            const infoY = tempCanvas.height - 60; 
            tempCtx.fillText(`餐桌数量：${this.tables.length}`, padding, infoY);
            tempCtx.fillText(`客人总数：${this.guests.length}`, padding, infoY + 20);
            tempCtx.fillText(`已安排：${this.guests.filter(g => g.tableId !== null).length} 人`, padding, infoY + 40);
            
            // 调整坐标系，为餐桌内容留出空间
            tempCtx.translate(padding - bounds.minX, titleHeight + padding - bounds.minY);
            
            // 使用html2canvas库的思路，手动绘制所有餐桌
            this.tables.forEach(table => {
                this.drawTableOnCanvas(tempCtx, table);
            });
            
            // 添加边框
            tempCtx.strokeStyle = '#e0e0e0';
            tempCtx.lineWidth = 1;
            tempCtx.strokeRect(-padding + bounds.minX, -titleHeight - padding + bounds.minY, tempCanvas.width, tempCanvas.height);
            
            // 导出为图片
            tempCanvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `座位安排图_${new Date().toISOString().slice(0, 10)}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    // 清理临时画布
                    tempCanvas.remove();
                }
            }, 'image/png', 0.95);
            
        } catch (error) {
            console.error('导出图片失败:', error);
            showMessage('导出图片失败：' + error.message, 'error');
        }
    }
    
    drawTableOnCanvas(ctx, table) {
        const radius = 125; // 餐桌半径，与createSeats方法保持一致
        
        // 绘制餐桌圆形背景
        ctx.beginPath();
        ctx.arc(table.x, table.y, radius, 0, 2 * Math.PI);
        
        // 创建天蓝色到钢蓝色的径向渐变，与CSS样式协调
        const gradient = ctx.createRadialGradient(table.x, table.y, 0, table.x, table.y, radius);
        gradient.addColorStop(0, '#87CEEB'); // 天蓝色（中心）
        gradient.addColorStop(1, '#4682B4'); // 钢蓝色（边缘）
        
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 绘制餐桌名称
        ctx.fillStyle = '#ffffff'; /* 白色文字，与蓝色背景对比更好 */
        ctx.font = 'bold 16px Microsoft YaHei, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(table.name, table.x, table.y - 10);
        
        // 绘制座位
        for (let i = 0; i < table.seatCount; i++) {
            const angle = (i * 2 * Math.PI) / table.seatCount - Math.PI / 2;
            const seatX = table.x + Math.cos(angle) * (radius + 145);
            const seatY = table.y + Math.sin(angle) * (radius + 145);
            
            // 绘制座位圆圈
            ctx.beginPath();
            ctx.arc(seatX, seatY, 25, 0, 2 * Math.PI);
            
            // 检查是否有客人
            const guest = table.guests.find(g => g.seatNumber === i + 1);
            if (guest) {
                ctx.fillStyle = '#4682B4'; /* 钢蓝色，与CSS样式一致 */
                ctx.strokeStyle = '#2F4F4F';
            } else {
                ctx.fillStyle = '#87CEEB'; /* 天蓝色 */
                ctx.strokeStyle = '#4682B4';
            }
            
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制座位编号或客人姓名
            ctx.fillStyle = guest ? '#ffffff' : '#495057';
            ctx.font = guest ? '12px Microsoft YaHei, Arial, sans-serif' : '10px Microsoft YaHei, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const displayText = guest ? guest.name : (i + 1).toString();
            
            // 如果文字太长，进行截断
            if (displayText.length > 4) {
                ctx.font = '10px Microsoft YaHei, Arial, sans-serif';
                ctx.fillText(displayText.substring(0, 3) + '...', seatX, seatY);
            } else {
                ctx.fillText(displayText, seatX, seatY);
            }
        }
    }
    
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    getCanvasBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        // 计算所有餐桌的边界
        this.tables.forEach(table => {
            const radius = 125; // 餐桌半径，与createSeats方法保持一致
            
            minX = Math.min(minX, table.x - radius);
            minY = Math.min(minY, table.y - radius);
            maxX = Math.max(maxX, table.x + radius);
            maxY = Math.max(maxY, table.y + radius);
        });
        
        // 如果没有餐桌，使用默认边界
        if (minX === Infinity) {
            return { minX: 0, minY: 0, width: 800, height: 600 };
        }
        
        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    // 本地存储相关方法
    saveToLocalStorage() {
        try {
            const data = {
                tables: this.tables,
                guests: this.guests,
                tableIdCounter: this.tableIdCounter,
                guestIdCounter: this.guestIdCounter,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('seatingArrangementDraft', JSON.stringify(data));
            console.log('数据已自动保存到本地存储');
            this.showSaveStatus('已保存');
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            this.showSaveStatus('保存失败', 'error');
        }
    }
    
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('seatingArrangementDraft');
            if (!savedData) {
                return false;
            }
            
            const data = JSON.parse(savedData);
            
            // 验证数据完整性
            if (!data.tables || !data.guests || !data.tableIdCounter || !data.guestIdCounter) {
                console.warn('本地存储数据格式不完整');
                return false;
            }
            
            // 恢复数据
            this.tables = data.tables;
            this.guests = data.guests;
            this.tableIdCounter = data.tableIdCounter;
            this.guestIdCounter = data.guestIdCounter;
            
            // 显示恢复提示
            const savedTime = new Date(data.timestamp);
            const timeStr = savedTime.toLocaleString('zh-CN');
            console.log(`已从本地存储恢复数据（保存时间：${timeStr}）`);
            
            return true;
        } catch (error) {
            console.error('从本地存储加载数据失败:', error);
            return false;
        }
    }
    
    startAutoSave() {
        // 每30秒自动保存一次
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);
        
        // 在页面关闭或刷新前保存
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
        
        // 监听数据变化，重要操作时立即保存
        this.setupDataChangeListeners();
        
        console.log('自动保存功能已启动');
    }
    
    setupDataChangeListeners() {
        // 监听可能导致数据变化的操作
        const operations = [
            'addTable', 'deleteTable', 'resetLayout',
            'addGuest', 'removeGuestFromSeat', 'saveSeatEdit',
            'saveTableSettings', 'importGuestData'
        ];
        
        operations.forEach(operation => {
            const originalMethod = this[operation];
            this[operation] = (...args) => {
                const result = originalMethod.apply(this, args);
                // 延迟保存，避免频繁操作
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveToLocalStorage();
                }, 1000);
                return result;
            };
        });
    }
    
    clearLocalStorage() {
        try {
            localStorage.removeItem('seatingArrangementDraft');
            console.log('本地存储数据已清除');
        } catch (error) {
            console.error('清除本地存储失败:', error);
        }
    }
    
    showSaveStatus(message, type = 'success') {
        const saveStatus = document.getElementById('saveStatus');
        const saveText = saveStatus.querySelector('.save-text');
        const saveIndicator = saveStatus.querySelector('.save-indicator');
        
        // 添加过渡效果，使文字变化更平滑
        saveStatus.style.transition = 'all 0.3s ease';
        saveText.style.transition = 'opacity 0.2s ease';
        
        // 先淡出旧文字
        saveText.style.opacity = '0';
        
        setTimeout(() => {
            // 更新文字内容
            saveText.textContent = message;
            
            // 根据类型设置样式
            if (type === 'error') {
                saveIndicator.style.backgroundColor = '#dc3545';
                saveStatus.style.color = '#dc3545';
            } else {
                saveIndicator.style.backgroundColor = '#28a745';
                saveStatus.style.color = '#6c757d';
            }
            
            // 淡入新文字
            saveText.style.opacity = '1';
            
            // 显示状态
            saveStatus.style.opacity = '1';
        }, 150);
        
        // 3秒后恢复默认状态
        clearTimeout(this.saveStatusTimeout);
        this.saveStatusTimeout = setTimeout(() => {
            // 淡出当前文字
            saveText.style.opacity = '0';
            
            setTimeout(() => {
                saveText.textContent = '自动保存中...';
                saveIndicator.style.backgroundColor = '#28a745';
                saveStatus.style.color = '#6c757d';
                saveText.style.opacity = '1';
            }, 150);
        }, 3000);
    }
    
    debugRender() {
        console.log('=== Debug Render Called ===');
        
        const seatingArea = document.getElementById('seatingArea');
        console.log('SeatingArea element:', seatingArea);
        
        if (seatingArea) {
            console.log('Current styles:', {
                display: getComputedStyle(seatingArea).display,
                visibility: getComputedStyle(seatingArea).visibility,
                opacity: getComputedStyle(seatingArea).opacity,
                minHeight: getComputedStyle(seatingArea).minHeight,
                minWidth: getComputedStyle(seatingArea).minWidth
            });
            
            // 强制设置可见样式
            seatingArea.style.display = 'flex';
            seatingArea.style.visibility = 'visible';
            seatingArea.style.opacity = '1';
            
            console.log('After forcing styles:', {
                display: getComputedStyle(seatingArea).display,
                visibility: getComputedStyle(seatingArea).visibility,
                opacity: getComputedStyle(seatingArea).opacity
            });
            
            // 检查表格数据
            console.log('Tables data:', this.tables);
            console.log('Tables length:', this.tables.length);
            
            if (this.tables.length > 0) {
                console.log('Calling renderTables...');
                this.renderTables();
                
                // 检查渲染结果
                setTimeout(() => {
                    const tableElements = seatingArea.querySelectorAll('.table');
                    console.log('Rendered table elements count:', tableElements.length);
                    
                    tableElements.forEach((tableEl, index) => {
                        console.log(`Table ${index}:`, {
                            id: tableEl.id,
                            style: {
                                display: getComputedStyle(tableEl).display,
                                visibility: getComputedStyle(tableEl).visibility,
                                opacity: getComputedStyle(tableEl).opacity
                            }
                        });
                    });
                }, 500);
            } else {
                console.log('No tables to render, adding default table...');
                this.addDefaultTable();
            }
        } else {
            console.error('SeatingArea element not found!');
        }
        
        console.log('=== Debug Render Complete ===');
    }
    
    // 验证客人数据的一致性
    validateGuestData() {
        console.log('=== 客人数据验证开始 ===');
        
        let issues = [];
        
        // 检查客人列表状态
        this.guests.forEach(guest => {
            if (guest.tableId && !guest.seatNumber) {
                issues.push(`客人 ${guest.name} 有tableId但无seatNumber`);
            }
            if (!guest.tableId && guest.seatNumber) {
                issues.push(`客人 ${guest.name} 有seatNumber但无tableId`);
            }
            
            if (guest.tableId) {
                const table = this.tables.find(t => t.id === guest.tableId);
                if (!table) {
                    issues.push(`客人 ${guest.name} 引用了不存在的餐桌 ${guest.tableId}`);
                } else {
                    // 检查客人是否确实在餐桌的客人列表中
                    const inTableGuests = table.guests.find(g => g.id === guest.id);
                    if (!inTableGuests) {
                        issues.push(`客人 ${guest.name} 标记为在餐桌 ${table.name} 上，但不在该餐桌的客人列表中`);
                    }
                }
            }
        });
        
        // 检查餐桌客人列表
        this.tables.forEach(table => {
            table.guests.forEach(tableGuest => {
                const guest = this.guests.find(g => g.id === tableGuest.id);
                if (!guest) {
                    issues.push(`餐桌 ${table.name} 包含不存在的客人 ${tableGuest.name}`);
                } else if (guest.tableId !== table.id) {
                    issues.push(`餐桌 ${table.name} 中的客人 ${guest.name} 标记为在餐桌 ${guest.tableId} 上`);
                } else if (guest.seatNumber !== tableGuest.seatNumber) {
                    issues.push(`餐桌 ${table.name} 中的客人 ${guest.name} 座位号不一致: ${tableGuest.seatNumber} vs ${guest.seatNumber}`);
                }
            });
        });
        
        if (issues.length > 0) {
            console.warn('发现数据一致性问题:');
            issues.forEach(issue => console.warn(`  - ${issue}`));
        } else {
            console.log('客人数据一致性检查通过');
        }
        
        console.log('=== 客人数据验证完成 ===');
        return issues;
    }
    
    // 测试画布调整功能 - 创建多个不同位置的餐桌
    testCanvasAdjustment() {
        console.log('=== 测试画布调整功能 ===');
        
        // 清除现有餐桌
        this.tables = [];
        this.guests = [];
        this.tableIdCounter = 1;
        this.guestIdCounter = 1;
        
        // 创建几个在不同位置的测试餐桌
        const testTables = [
            { name: '主桌', x: 100, y: 100, seatCount: 12 },
            { name: '副桌1', x: 500, y: 200, seatCount: 10 },
            { name: '副桌2', x: 200, y: 500, seatCount: 8 },
            { name: '副桌3', x: 800, y: 400, seatCount: 12 }
        ];
        
        testTables.forEach(tableData => {
            const table = {
                id: this.tableIdCounter++,
                name: tableData.name,
                seatCount: tableData.seatCount,
                x: tableData.x,
                y: tableData.y,
                guests: []
            };
            this.tables.push(table);
        });
        
        console.log('Created test tables:', this.tables);
        
        // 重新渲染并调整画布
        this.renderTables();
        this.updateTableList();
        this.adjustCanvasSize();
        
        console.log('=== 画布调整测试完成 ===');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // 等待所有资源加载完成
    window.addEventListener('load', () => {
        console.log('Window load event fired');
        
        // 使用更长的延迟确保所有元素都渲染完成
        setTimeout(() => {
            console.log('Creating SeatingArrangement instance');
            const app = new SeatingArrangement();
            console.log('SeatingArrangement instance created:', app);
            
            // 确保seatingArea可见并强制渲染
            const seatingArea = document.getElementById('seatingArea');
            console.log('Final seatingArea check:', seatingArea);
            if (seatingArea) {
                // 强制设置可见样式，确保画布显示
                seatingArea.style.display = 'flex';
                seatingArea.style.visibility = 'visible';
                seatingArea.style.opacity = '1';
                
                console.log('seatingArea styles after forcing:', {
                    display: getComputedStyle(seatingArea).display,
                    visibility: getComputedStyle(seatingArea).visibility,
                    opacity: getComputedStyle(seatingArea).opacity
                });
                
                // 强制浏览器重绘
                seatingArea.offsetHeight;
                
                // 如果仍然没有表格，添加默认表格
                if (app.tables.length === 0) {
                    console.log('No tables found during initialization, adding default table...');
                    app.addDefaultTable();
                } else {
                    console.log('Tables found, calling renderTables...');
                    app.renderTables();
                }
                
                // 确保画布大小正确适配 - 基于实际餐桌位置
                console.log('Initial canvas size adjustment based on restored table positions');
                console.log('Current tables count:', app.tables.length);
                app.adjustCanvasSize();
                
                // 延迟后再次检查，确保适配完成
                setTimeout(() => {
                    console.log('Delayed canvas size check after restoration');
                    app.adjustCanvasSize();
                }, 1000);
                
                // 添加窗口大小改变监听，自动调整画布大小
                window.addEventListener('resize', () => {
                    console.log('Window resize event fired');
                    app.adjustCanvasSize();
                });
                
                // 添加页面可见性变化监听，处理页面刷新后的画布适配
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) {
                        console.log('Page became visible, adjusting canvas size');
                        setTimeout(() => {
                            app.adjustCanvasSize();
                        }, 100);
                    }
                });
                
                // 添加pageshow事件监听，处理页面刷新和从缓存恢复的情况
                window.addEventListener('pageshow', (event) => {
                    console.log('Pageshow event fired, persisted:', event.persisted);
                    if (event.persisted) {
                        // 页面从缓存恢复，需要重新调整画布大小
                        console.log('Page restored from cache, adjusting canvas size based on restored positions');
                        setTimeout(() => {
                            app.adjustCanvasSize();
                        }, 100);
                    }
                });
            }
        }, 500); // 增加到500ms延迟
    });
});