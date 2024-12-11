const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const os = require('os');
const { exec } = require('child_process');


// Определяем порт сервера
const PORT = 8080;

//Создаём HTTP сервер
const server = http.createServer((req, res) => {
    // Обработка запроса на index.html
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Ошибка сервера');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    } 
    // Обработка запроса на style.css
    else if (req.url === '/style.css') {
        fs.readFile(path.join(__dirname, 'style.css'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Ошибка сервера');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
            res.end(data);
        });
    }
    // Обработка запроса на script.js
    else if (req.url === '/script.js') {
        fs.readFile(path.join(__dirname, 'script.js'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Ошибка сервера');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(data);
        });
    } 
    // Обработка запроса на изображения
    else if (req.url.startsWith('/')) {
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Изображение не найдено');
                return;
            }
            const extname = path.extname(filePath).toLowerCase();
            let contentType = 'image/png';  // По умолчанию PNG

            if (extname === '.jpg' || extname === '.jpeg') {
                contentType = 'image/jpeg';
            } else if (extname === '.gif') {
                contentType = 'image/gif';
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }
    // Если файл не найден
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Страница не найдена');
    }
});

// Создаём WebSocket сервер, привязанный к HTTP серверу
const wss = new WebSocket.Server({ server });

// Функция для получения локального IP-адреса
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (let iface in interfaces) {
        for (let alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost'; // Если IP не найден, используем localhost
}

// Запуск сервера
server.listen(PORT, () => {
    console.log(`HTTP сервер запущен на порту ${PORT}`);

    // Открытие файла index.html в браузере
    const localIP = getLocalIPAddress();
    const url = `http://${localIP}:${PORT}`;
    console.log(`Открывается браузер по адресу: ${url}`);
    
    // В зависимости от операционной системы, открываем браузер
    if (process.platform === 'win32') {
        exec(`start ${url}`); // Для Windows
    } else if (process.platform === 'darwin') {
        exec(`open ${url}`); // Для macOS
    } else {
        exec(`xdg-open ${url}`); // Для Linux
    }
});

// Функция для получения локального IP-адреса
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (let iface in interfaces) {
        for (let alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost'; // Если IP не найден, используем localhost
}

// Вывод ссылки при запуске сервера
const localIP = getLocalIPAddress();
console.log(`WebSocket сервер запущен!`);
console.log(`Локальная ссылка: http://localhost:${PORT}`);
console.log(`Ссылка в сети: http://${localIP}:${PORT}`);

let players = {};  // Хранение информации о всех игроков
const obstacles = [
    { x: 60, y: 60, width: 60, height: 150 },
    { x: 180, y: 60, width: 60, height: 150 },
    { x:300, y: 60, width: 60, height: 150 },
    { x:430, y: 60, width: 60, height: 150 },
    { x:560, y: 60, width: 60, height: 150 },
    { x:680, y: 60, width: 60, height: 150 },

    { x: 60, y: 390, width: 60, height: 150 },
    { x: 180, y: 390, width: 60, height: 150 },
    { x:300, y: 390, width: 60, height: 150 },
    { x:430, y: 390, width: 60, height: 150 },
    { x:560, y: 390, width: 60, height: 150 },
    { x:680, y: 390, width: 60, height: 150 },

    { x: 150, y: 270, width: 150, height: 60 },
    { x: 500,y: 270, width: 150, height: 60 },
];

function generateId() {
    return `player-${Math.random().toString(36).substr(2, 9)}`;
}

// Рассылка всем клиентам
function broadcast(message) {
    for (let playerId in players) {
        players[playerId].ws.send(JSON.stringify(message));
    }
}

function checkBulletCollision(bulletX, bulletY, tank) {
    const bulletHitboxSize = 8; // Добавляем 10 пикселей к размеру пули
    return !(
        bulletX + bulletHitboxSize < tank.x || // Левый край пули не касается танка
        bulletX - bulletHitboxSize > tank.x + 50 || // Правый край пули не касается танка
        bulletY + bulletHitboxSize < tank.y || // Верхний край пули не касается танка
        bulletY - bulletHitboxSize > tank.y + 50 // Нижний край пули не касается танка
    );
}

function isFreeSpace(x, y, size) {
    // Проверка столкновений с другими танками
    const collisionWithTanks = Object.values(players).some(player => 
        player.alive &&
        x < player.x + size &&
        x + size > player.x &&
        y < player.y + size &&
        y + size > player.y
    );

    // Проверка столкновений с препятствиями
    const collisionWithObstacles = obstacles.some(obstacle =>
        x < obstacle.x + obstacle.width &&
        x + size > obstacle.x &&
        y < obstacle.y + obstacle.height &&
        y + size > obstacle.y
    );

    return !collisionWithTanks && !collisionWithObstacles;
}

wss.on('connection', (ws) => {
    const playerId = generateId();
    players[playerId] = { ws, x: 100, y: 100, direction: 'right', alive: true, score: 0, name: `Игрок ${Object.keys(players).length + 1}` };

    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        tanks: Object.entries(players).map(([id, player]) => ({
            id,
            x: player.x,
            y: player.y,
            direction: player.direction,
            alive: player.alive,
            score: player.score,
            name: player.name
        }))
    }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'move':
                if (players[data.playerId]) {
                    players[data.playerId].x = data.x;
                    players[data.playerId].y = data.y;
                    players[data.playerId].direction = data.direction;
                    broadcast({
                        type: 'update',
                        playerId: data.playerId,
                        x: data.x,
                        y: data.y,
                        direction: data.direction
                    });
                }
                break;

            case 'shoot':
                broadcast({
                    type: 'bullet',
                    playerId: data.playerId,
                    x: data.x,
                    y: data.y,
                });
                Object.keys(players).forEach((targetId) => {
                    if (targetId !== data.playerId && players[targetId].alive && checkBulletCollision(data.x, data.y, players[targetId])) {
                        // Убитый игрок
                        players[targetId].alive = false;                 
                        // Убийца получает 1 очко
                        players[data.playerId].score += 1; 

                        // Отправляем сообщения всем клиентам о смерти
                        broadcast({
                            type: 'death',
                            playerId: targetId, // Убитый игрок
                            killerId: data.playerId, // Убийца
                            scores: Object.entries(players).map(([id, player]) => ({
                                playerId: id,
                                score: player.score,
                                name: player.name
                            }))
                        });
                        broadcast({
                            type: 'score_update',
                            scores: Object.entries(players).map(([id, player]) => ({
                                playerId: id,
                                score: player.score,
                                name: player.name
                            }))
                        });
                        
                    }
                });
                break;

            case 'death':
                if (players[data.playerId]) {
                    players[data.playerId].alive = false;
                    // Отправляем сообщение о смерти
                    broadcast({
                        type: 'death',
                        playerId: data.playerId
                    });
                }
                break;

            case 'respawn': {
                const tankSize = 50;
                let x, y;
                let attempts = 0;
                const maxAttempts = 100;
    
                do {
                    x = Math.floor(Math.random() * (800 - tankSize));
                    y = Math.floor(Math.random() * (600 - tankSize));
                    attempts++;
                } while (!isFreeSpace(x, y, tankSize) && attempts < maxAttempts);
    
                if (attempts === maxAttempts) {
                    console.warn('Не удалось найти свободное место для респавна');
                    x = 0;
                    y = 0;
                }
    
                players[data.playerId].alive = true;
                players[data.playerId].x = x;
                players[data.playerId].y = y;
    
                broadcast({
                    type: 'respawn',
                    playerId: data.playerId,
                    x,
                    y,
                });
                break;
            }

            if (!players[data.playerId]) {
                players[data.playerId] = { ws, x: 100, y: 100, direction: 'right', alive: true, name: data.name };
                broadcast({ type: 'register', playerId: data.playerId, name: data.name });
            }
            break;
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        broadcast({ type: 'disconnect', playerId });
    });
});


