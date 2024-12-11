const game = document.getElementById('game');
let playerId = null;
const tanks = {};
const bullets = {}; // Хранение пуль

// Размеры игрового поля
const gameWidth = 800;
const gameHeight = 600;
const obstacles = [
    { x: 60, y: 60, width: 40, height: 150 },
    { x: 180, y: 60, width: 40, height: 150 },
    { x:300, y: 60, width: 40, height: 150 },
    { x:430, y: 60, width: 40, height: 150 },
    { x:560, y: 60, width: 40, height: 150 },
    { x:680, y: 60, width: 40, height: 150 },

    { x: 60, y: 390, width: 40, height: 150 },
    { x: 180, y: 390, width: 40, height: 150 },
    { x:300, y: 390, width: 40, height: 150 },
    { x:430, y: 390, width: 40, height: 150 },
    { x:560, y: 390, width: 40, height: 150 },
    { x:680, y: 390, width: 40, height: 150 },

    { x: 150, y: 270, width: 150, height: 30 },
    { x: 500,y: 270, width: 150, height: 30 },

];

// Направление танка (по умолчанию движется вправо)
let tankDirection = 'right'; // 'up', 'down', 'left', 'right'

// Устанавливаем соединение с сервером
const ws = new WebSocket('ws://25.12.196.61:8080');

function updateScoreboard(scores) {
    const scoreboard = document.getElementById('scores');
    scoreboard.innerHTML = ''; // Очистка старых данных

    scores.forEach(({ playerId, score, name }) => {
        const scoreItem = document.createElement('li');
        scoreItem.textContent = `${name}: ${score}`;
        scoreboard.appendChild(scoreItem);
        console.log(score);
    });
}

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'init':
            playerId = data.playerId;
            data.tanks.forEach((tank) => {
                const { id, x, y, direction, alive } = tank;
                if (alive) {
                    createTank(id, x, y, direction);
                }
            });
            if (!tanks[playerId]) {
                createTank(playerId);
            }
            break;
        case 'score_update':
            updateScoreboard(data.scores);
            break;
            
        case 'update':
            if (tanks[data.playerId]) {
                updateTank(data.playerId, data.x, data.y, data.direction);
            } else {
                createTank(data.playerId, data.x, data.y, data.direction);
            }
            break;

        case 'death':
            if (tanks[data.playerId]) {
                tanks[data.playerId].tank.remove();
                delete tanks[data.playerId];
                
                // Отображаем кнопку возрождения
                if (data.playerId === playerId) {
                    showRespawnButton();      
                }
            }
            break;

        case 'respawn':
            // Когда приходит сообщение о возрождении
            if (!tanks[data.playerId]) {
                createTank(data.playerId, data.x, data.y, 'right');
            } else {
                updateTank(data.playerId, data.x, data.y, 'right');
            }
            break;

        case 'bullet':
            if (bullets[data.bulletId]) {
                updateBullet(data.bulletId, data.x, data.y);
            } else {
                createBullet(data.bulletId, data.x, data.y);
            }
            break;
    }
};

// Создание танка
function createTank(id, initialX = null, initialY = null, direction = 'right') {
    let x = initialX;
    let y = initialY;

    const tankSize = 50; // Размер танка
    const maxAttempts = 100; // Максимальное число попыток найти свободное место
    let attempts = 0;

    while ((x === null || y === null || !isFreeSpace(x, y, tankSize)) && attempts < maxAttempts) {
        x = Math.floor(Math.random() * (gameWidth - tankSize));
        y = Math.floor(Math.random() * (gameHeight - tankSize));
        attempts++;
    }

    if (attempts === maxAttempts) {
        console.warn('Не удалось найти свободное место для танка');
        x = 0; // Фолбэк-координаты
        y = 0;
    }

    const tank = document.createElement('div');
    tank.className = 'tank';
    tank.style.left = `${x}px`;
    tank.style.top = `${y}px`;
    game.appendChild(tank);

    tanks[id] = { tank, x, y, direction };
}

function isFreeSpace(x, y, tankSize) {
    // Проверяем препятствия
    if (checkObstacleCollision(x, y, tankSize, tankSize)) {
        return false;
    }

    // Проверяем другие танки
    return !Object.values(tanks).some(({ x: otherX, y: otherY }) => {
        return (
            x < otherX + tankSize &&
            x + tankSize > otherX &&
            y < otherY + tankSize &&
            y + tankSize > otherY
        );
    });
}

// Обновление позиции танка
function updateTank(id, x, y, direction) {
    const { tank } = tanks[id];
    tank.style.left = `${x}px`;
    tank.style.top = `${y}px`;
    tanks[id].x = x;
    tanks[id].y = y;
    tanks[id].direction = direction;

    // Поворот танка
    switch (direction) {
        case 'up':
            tank.style.transform = 'rotate(-90deg)';
            break;
        case 'down':
            tank.style.transform = 'rotate(90deg)';
            break;
        case 'left':
            tank.style.transform = 'rotate(180deg)';
            break;
        case 'right':
            tank.style.transform = 'rotate(0deg)';
            break;
    }
}

// Создание пули
function createBullet(bulletId, x, y) {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.left = `${x}px`;
    bullet.style.top = `${y}px`;
    game.appendChild(bullet);
    bullets[bulletId] = bullet;
}

// Обновление позиции пули
function updateBullet(bulletId, x, y) {
    const bullet = bullets[bulletId];
    bullet.style.left = `${x}px`;
    bullet.style.top = `${y}px`;
}

// Проверка столкновения пули с танком
function checkBulletCollision(bullet, tank) {
    const bulletRect = bullet.getBoundingClientRect();
    const tankRect = tank.getBoundingClientRect();
    
    return !(bulletRect.right < tankRect.left || bulletRect.left > tankRect.right || bulletRect.bottom < tankRect.top || bulletRect.top > tankRect.bottom);
}

// Проверка столкновения пули с препятствиями
function checkObstacleCollision(x, y, width, height) {
    // Получаем границы объекта (в данном случае пули)
    const objectRect = { x, y, width, height };

    // Проходим по всем препятствиям
    return obstacles.some((obstacle) => {
        const obstacleRect = {
            x: obstacle.x,
            y: obstacle.y,
            width: obstacle.width,
            height: obstacle.height,
        };

        // Проверяем столкновение
        return !(objectRect.x + objectRect.width < obstacleRect.x ||
                 objectRect.x > obstacleRect.x + obstacleRect.width ||
                 objectRect.y + objectRect.height < obstacleRect.y ||
                 objectRect.y > obstacleRect.y + obstacleRect.height);
    });
}

// Управление танком
document.addEventListener('keydown', (e) => {
    if (!playerId) return;

    const { tank } = tanks[playerId];
    const step = 7; // Шаг танка

    let x = parseInt(tank.style.left) || 0;
    let y = parseInt(tank.style.top) || 0;

    if (e.key === 'ArrowUp') {
        const newY = y - step;
        if (!checkObstacleCollision(x, newY, tank.offsetWidth, tank.offsetHeight) && newY >= 0) {
            y = newY;
            tankDirection = 'up';
        }
    } else if (e.key === 'ArrowDown') {
        const newY = y + step;
        if (!checkObstacleCollision(x, newY, tank.offsetWidth, tank.offsetHeight) && newY <= gameHeight - tank.offsetHeight) {
            y = newY;
            tankDirection = 'down';
        }
    } else if (e.key === 'ArrowLeft') {
        const newX = x - step;
        if (!checkObstacleCollision(newX, y, tank.offsetWidth, tank.offsetHeight) && newX >= 0) {
            x = newX;
            tankDirection = 'left';
        }
    } else if (e.key === 'ArrowRight') {
        const newX = x + step;
        if (!checkObstacleCollision(newX, y, tank.offsetWidth, tank.offsetHeight) && newX <= gameWidth - tank.offsetWidth) {
            x = newX;
            tankDirection = 'right';
        }
    }

    tank.style.left = `${x}px`;
    tank.style.top = `${y}px`;
    updateTank(playerId, x, y, tankDirection);

    ws.send(JSON.stringify({ type: 'move', playerId, x, y, direction: tankDirection }));
});

// Управление стрельбой
let lastShotTime = 0; 
const shootCooldown = 1000; 

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && playerId) {
        const currentTime = Date.now();

        // Проверяем, прошло ли достаточно времени с момента последнего выстрела
        if (currentTime - lastShotTime < shootCooldown) {
            return; // Если задержка не истекла, прерываем обработчик
        }

        lastShotTime = currentTime; // Обновляем время последнего выстрела

        const { tank } = tanks[playerId];
        const x = parseInt(tank.style.left) || 0;
        const y = parseInt(tank.style.top) || 0;

        const tankWidth = tank.offsetWidth;
        const tankHeight = tank.offsetHeight;

        let bulletX = x;
        let bulletY = y;

        if (tankDirection === 'up') {
            bulletX += tankWidth / 2 - 2;
            bulletY -= 10;
        } else if (tankDirection === 'down') {
            bulletX += tankWidth / 2 - 2;
            bulletY += tankHeight + 10;
        } else if (tankDirection === 'left') {
            bulletX -= 10;
            bulletY += tankHeight / 2 - 2;
        } else if (tankDirection === 'right') {
            bulletX += tankWidth + 10;
            bulletY += tankHeight / 2 - 2;
        }

        const bulletId = `${playerId}-${Date.now()}`;
        createBullet(bulletId, bulletX, bulletY);
        ws.send(JSON.stringify({ type: 'shoot', playerId, bulletId, x: bulletX, y: bulletY }));

        const bulletSpeed = 3;
        let bulletDirectionX = 0;
        let bulletDirectionY = 0;

        if (tankDirection === 'up') {
            bulletDirectionY = -bulletSpeed;
        } else if (tankDirection === 'down') {
            bulletDirectionY = bulletSpeed;
        } else if (tankDirection === 'left') {
            bulletDirectionX = -bulletSpeed;
        } else if (tankDirection === 'right') {
            bulletDirectionX = bulletSpeed;
        }

        function moveBullet() {
            bulletX += bulletDirectionX;
            bulletY += bulletDirectionY;
            updateBullet(bulletId, bulletX, bulletY);
            ws.send(JSON.stringify({ type: 'shoot', playerId, bulletId, x: bulletX, y: bulletY }));

            if (checkObstacleCollision(bulletX, bulletY, bullets[bulletId].offsetWidth, bullets[bulletId].offsetHeight)) {
                bullets[bulletId].remove();
                delete bullets[bulletId];
                return;
            }

            if (bulletX < 0  || bulletX > gameWidth || bulletY < 0 || bulletY > gameHeight) {
                bullets[bulletId].remove();
                delete bullets[bulletId];
                return;
            }

            Object.keys(tanks).forEach((tankId) => {
                if (tankId !== playerId && checkBulletCollision(bullets[bulletId], tanks[tankId].tank)) {
                    bullets[bulletId].remove();
                    delete bullets[bulletId];
                    tanks[tankId].tank.remove();
                    delete tanks[tankId];

                    ws.send(JSON.stringify({ type: 'death', playerId: tankId }));
                }
            });

            requestAnimationFrame(moveBullet);
        }

        moveBullet();
    }
});

// Функция для отображения кнопки возрождения
function showRespawnButton() {
    if (document.querySelector('.respawn-button')) return;

    const respawnButton = document.createElement('button');
    respawnButton.classList.add('respawn-button');
    respawnButton.textContent = 'Возродиться';
    respawnButton.style.position = 'absolute';
    respawnButton.style.left = '50%';
    respawnButton.style.top = '50%';
    respawnButton.style.transform = 'translate(-50%, -50%)';
    respawnButton.style.backgroundImage = 'url("./button.png")';
    respawnButton.style.width = '103px';
    respawnButton.style.height = '33px';  
    respawnButton.style.fontFamily ='Courier New';
    respawnButton.style.fontWeight = 'bold';
    game.appendChild(respawnButton);
  

    respawnButton.addEventListener('click', () => {
        respawnTank();  // Возрождение танка
        respawnButton.remove();  // Убираем кнопку после нажатия
    });
}

// Функция для возрождения танка
function respawnTank() {
    const tankSize = 50; // Размер танка
    const maxAttempts = 100; // Максимальное число попыток найти свободное место
    let attempts = 0;
    let x, y;

    do {
        x = Math.floor(Math.random() * (gameWidth - tankSize));
        y = Math.floor(Math.random() * (gameHeight - tankSize));
        attempts++;
    } while (!isFreeSpace(x, y, tankSize) && attempts < maxAttempts);

    if (attempts === maxAttempts) {
        console.warn('Не удалось найти свободное место для респавна');
        x = 0;
        y = 0;
    }

    // Отправляем сообщение на сервер о респавне
    ws.send(JSON.stringify({ type: 'respawn', playerId, x, y }));

    // Создаем танк на новых координатах
    createTank(playerId, x, y);
    ws.send(JSON.stringify({ type: 'move', playerId, x, y, direction: tankDirection }));
}

// Проверка столкновения с препятствиями
function checkObstacleCollision(x, y, width, height) {

    // Получаем границы танка
    const objectRect = { x, y, width, height };

    // Проходим по всем препятствиям
    return obstacles.some((obstacle) => {
        const obstacleRect = {
            x: obstacle.x,
            y: obstacle.y,
            width: obstacle.width,
            height: obstacle.height,
        };

        // Проверяем столкновение
        const collision = !(objectRect.x + objectRect.width < obstacleRect.x ||
            objectRect.x > obstacleRect.x + obstacleRect.width ||
            objectRect.y + objectRect.height < obstacleRect.y ||
            objectRect.y > obstacleRect.y + obstacleRect.height);

        if (collision) {
            console.log('Столкновение с препятствием');
        }
        return collision;
    });
}

// Создание препятствий
function createObstacles() {
    obstacles.forEach(obstacle => {
        const obstacleElement = document.createElement('div');
        obstacleElement.className = 'obstacle';
        obstacleElement.style.left = `${obstacle.x}px`;
        obstacleElement.style.top = `${obstacle.y}px`;
        obstacleElement.style.width = `${obstacle.width}px`;
        obstacleElement.style.height = `${obstacle.height}px`;
        obstacleElement.style.position = 'absolute';
        obstacleElement.style.backgroundColor = 'gray'; // Цвет препятствия
        game.appendChild(obstacleElement);
    });
}

createObstacles(); // Вызываем для создания препятствий
