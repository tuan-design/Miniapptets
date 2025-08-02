// Các biến toàn cục cho scene 3D
let scene, camera, renderer, objects = [];
let api_url; // Biến này sẽ chứa URL của Web App Apps Script của bạn

// --- Khởi tạo Scene ---
function init() {
    // 1. Lấy URL của Web App từ query string
    const params = new URLSearchParams(window.location.search);
    api_url = params.get('api');
    const sheetId = params.get('sheetId');
    if (!api_url || !sheetId) {
        document.getElementById('loading-screen').innerText = "Lỗi: Không tìm thấy URL API hoặc Sheet ID.";
        return;
    }
    
    // 2. Thiết lập scene, camera và renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 3. Thêm ánh sáng
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // 4. Thiết lập vị trí camera
    camera.position.z = 5;
    
    // 5. Thêm sự kiện thay đổi kích thước cửa sổ
    window.addEventListener('resize', onWindowResize, false);
    
    // 6. Bắt đầu tải dữ liệu
    fetchDataAndCreateScene();
}

// --- Fetch dữ liệu từ Google Apps Script ---
async function fetchDataAndCreateScene() {
    try {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.innerText = "Đang tải dữ liệu...";

        // Gọi hàm API của Apps Script (ví dụ: getChartData)
        // Bạn cần thay thế 'getChartData' bằng tên hàm thực tế và các tham số
        const response = await fetch(`${api_url}?action=getChartData&startDate=2025-01-01&endDate=2025-12-31&sheetId=${sheetId}`);
        const data = await response.json();
        
        loadingScreen.style.display = 'none';

        if (data.error) {
            alert(`Lỗi từ API: ${data.error}`);
            return;
        }

        // Tạo các vật thể 3D dựa trên dữ liệu
        create3DObjects(data.chartData);

        // Bắt đầu vòng lặp render
        animate();

    } catch (error) {
        document.getElementById('loading-screen').innerText = "Lỗi khi tải dữ liệu. Vui lòng kiểm tra console.";
        console.error("Lỗi khi fetch dữ liệu:", error);
    }
}

// --- Tạo các vật thể 3D ---
function create3DObjects(chartData) {
    let totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
    let offset = 0;

    chartData.forEach(item => {
        const height = (item.amount / totalAmount) * 3; // Ví dụ: Chiều cao tỷ lệ với số tiền
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, height, 32);
        
        // Gán màu ngẫu nhiên cho mỗi danh mục
        const color = new THREE.Color(Math.random(), Math.random(), Math.random());
        const material = new THREE.MeshLambertMaterial({ color: color });
        
        const cylinder = new THREE.Mesh(geometry, material);
        
        // Sắp xếp các cylinder theo hàng ngang
        cylinder.position.set(offset, height / 2 - 1, 0);
        
        // Thêm một nhãn 3D đơn giản để hiển thị tên danh mục
        // (Phần này phức tạp hơn, đây chỉ là ý tưởng)
        cylinder.userData = { category: item.category, amount: item.amount };
        
        scene.add(cylinder);
        objects.push(cylinder);

        offset += 1.5;
    });
}

// --- Vòng lặp Animation/Render ---
function animate() {
    requestAnimationFrame(animate);
    
    // Hiệu ứng chuyển động (ví dụ: xoay các vật thể)
    objects.forEach(obj => {
        obj.rotation.x += 0.005;
        obj.rotation.y += 0.005;
    });

    renderer.render(scene, camera);
}

// --- Xử lý sự kiện thay đổi kích thước cửa sổ ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Khởi chạy ứng dụng
init();
