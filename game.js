class RunnerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.gameOverElement = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalHighScoreElement = document.getElementById('final-high-score');
        this.restartButton = document.getElementById('restart-button');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.difficultySettings = {
            initialSpeed: 4,          
            maxSpeed: 16,
            speedIncrease: 0.3,         
            initialCarInterval: 120,    
            minCarInterval: 40,
            carIntervalDecrease: 0.6,   
            initialMinGap: 350,         
            minGap: 100,                
            gapDecrease: 1.8,          
            initialCarSpeed: 4,        
            maxCarSpeed: 18,
            carSpeedIncrease: 0.35
        };

        this.isGameOver = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.speed = this.difficultySettings.initialSpeed;
        this.currentCarSpeed = this.difficultySettings.initialCarSpeed;
        this.groundY = this.canvas.height - 50;
        this.frameCount = 0;
        this.minGapBetweenCars = this.difficultySettings.initialMinGap;
        this.cars = [];
        this.carTimer = 0;
        this.lastCarX = -1000;
        this.carColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

      
        this.player = {
            x: 50,
            y: this.groundY - 45,
            width: 30,
            height: 50,
            jumping: false,
            velocity: 0,
            gravity: 0.6,
            jumpForce: -15,
            runFrame: 0,
            runFrameCount: 0
        };

    
        this.groundOffset = 0;
        this.groundSpeed = this.speed;


        document.addEventListener('keydown', (e) => this.handleInput(e));
        document.addEventListener('touchstart', () => this.jump());
        this.restartButton.addEventListener('click', () => this.restart());

        this.updateHighScoreDisplay();

        this.lastTime = 0;
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    resizeCanvas() {
        this.canvas.width = Math.min(800, window.innerWidth);
        this.canvas.height = 300;
        this.groundY = this.canvas.height - 50;
        if (this.player) this.player.y = this.groundY - 45;
    }

    handleInput(event) {
        if ((event.code === 'Space' || event.code === 'ArrowUp') && !event.repeat) {
            this.jump();
        }
    }

    jump() {
        if (!this.player.jumping && !this.isGameOver) {
            this.player.jumping = true;
            this.player.velocity = this.player.jumpForce;
        }
    }

    updatePlayer() {     
        this.player.velocity += this.player.gravity;
        this.player.y += this.player.velocity;

        if (this.player.y > this.groundY - 45) {
            this.player.y = this.groundY - 45;
            this.player.jumping = false;
            this.player.velocity = 0;
        }

        if (!this.player.jumping) {
            this.player.runFrameCount++;
            if (this.player.runFrameCount > 5) {
                this.player.runFrame = (this.player.runFrame + 1) % 2;
                this.player.runFrameCount = 0;
            }
        }
    }

    updateDifficulty() {
        const baseDifficulty = 1;
        const difficultyLevel = Math.min(10, 
            baseDifficulty + Math.floor(this.score / 100)
        );

        this.speed = Math.min(
            this.difficultySettings.maxSpeed,
            this.difficultySettings.initialSpeed + 
            (difficultyLevel * this.difficultySettings.speedIncrease)
        );

        this.currentCarSpeed = Math.min(
            this.difficultySettings.maxCarSpeed,
            this.difficultySettings.initialCarSpeed + 
            (difficultyLevel * this.difficultySettings.carSpeedIncrease)
        );

        this.minGapBetweenCars = Math.max(
            this.difficultySettings.minGap,
            this.difficultySettings.initialMinGap - 
            (difficultyLevel * this.difficultySettings.gapDecrease)
        );

        this.groundSpeed = this.speed;
    }

    canSpawnCar() {
        if (this.cars.length === 0) return true;
        const lastCar = this.cars[this.cars.length - 1];
        const gapToLastCar = this.canvas.width - lastCar.x;
        const requiredGap = this.minGapBetweenCars + (Math.random() * 100); // Less randomness (was 150)
        return gapToLastCar >= requiredGap;
    }

    spawnCar() {
        if (!this.canSpawnCar()) return;

        const width = 50 + Math.random() * 30;
        const height = 40;
        const speedVariation = 0.8 + Math.random() * 0.4;
        const carSpeed = this.currentCarSpeed * speedVariation;
        
        const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];
        
        this.cars.push({
            x: this.canvas.width,
            y: this.groundY - height + 15,
            width,
            height,
            speed: carSpeed,
            color
        });
    }

    updateCars() {
        this.cars = this.cars.filter(car => {
            car.x -= car.speed;
            return car.x > -car.width;
        });
        this.carTimer++;
        
        const spawnThreshold = Math.max(45, 
            this.difficultySettings.initialCarInterval - 
            (Math.floor(this.score / 80) * this.difficultySettings.carIntervalDecrease)
        );
        
        if (this.carTimer > spawnThreshold) {

            if (this.canSpawnCar()) {
                this.spawnCar();
                this.carTimer = 0;
            } else if (this.carTimer > spawnThreshold * 3) {
                
                this.carTimer = Math.floor(spawnThreshold * 0.5);
            }
        }
    }

    checkCollisions() {
        const playerHitbox = {
            x: this.player.x + 8,
            y: this.player.y + 15,
            width: 15,
            height: 45
        };

        for (const car of this.cars) {
            const carHitbox = {
                x: car.x + 5,
                y: car.y + 5,
                width: car.width - 10,
                height: car.height - 5
            };

            if (playerHitbox.x < carHitbox.x + carHitbox.width &&
                playerHitbox.x + playerHitbox.width > carHitbox.x &&
                playerHitbox.y < carHitbox.y + carHitbox.height &&
                playerHitbox.y + playerHitbox.height > carHitbox.y) {
                this.gameOver();
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.gameOverElement.classList.remove('hidden');
        this.finalScoreElement.textContent = Math.floor(this.score);
        this.finalHighScoreElement.textContent = Math.floor(this.highScore);
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', Math.floor(this.highScore));
            this.updateHighScoreDisplay();
        }
    }

    updateHighScoreDisplay() {
        this.highScoreElement.textContent = `High Score: ${Math.floor(this.highScore)}`;
    }

    restart() {
        this.isGameOver = false;
        this.score = 0;
        this.speed = this.difficultySettings.initialSpeed;
        this.currentCarSpeed = this.difficultySettings.initialCarSpeed;
        this.minGapBetweenCars = this.difficultySettings.initialMinGap;
        this.cars = [];
        this.carTimer = 0;
        this.player.y = this.groundY - 45;
        this.player.velocity = 0;
        this.player.jumping = false;
        this.groundSpeed = this.speed;
        this.gameOverElement.classList.add('hidden');
        this.updateHighScoreDisplay();
    }

    updateScore() {
        if (!this.isGameOver) {
            this.score += 0.1;
            const roundedScore = Math.floor(this.score);
            this.scoreElement.textContent = `Score: ${roundedScore}`;
            this.updateDifficulty();
        }
    }

    drawGround() {
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(0, this.groundY + 10, this.canvas.width, 40);
        this.ctx.fillStyle = '#fff';
        this.groundOffset = (this.groundOffset - this.groundSpeed) % 50;
        for (let x = this.groundOffset; x < this.canvas.width; x += 50) {
            this.ctx.fillRect(x, this.groundY + 28, 30, 4);
        }
    }

    drawPlayer() {
        const x = this.player.x;
        const y = this.player.y;
        const skinColor = '#ffd5b5';
        const clothesColor = '#3498db';
        const hairColor = '#2c3e50';
        
        this.ctx.fillStyle = skinColor;
        this.ctx.beginPath();
        this.ctx.arc(x + 15, y + 10, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = hairColor;
        this.ctx.beginPath();
        this.ctx.arc(x + 15, y + 7, 10, Math.PI, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = clothesColor;
        this.ctx.fillRect(x + 10, y + 20, 10, 20);

        const armOffsetY = this.player.jumping ? -2 : Math.sin(this.player.runFrameCount * 0.5) * 2;
        this.ctx.fillStyle = clothesColor;
        this.ctx.save();
        this.ctx.translate(x + 8, y + 22);
        this.ctx.rotate(-0.3 + Math.sin(this.player.runFrameCount * 0.5) * 0.2);
        this.ctx.fillRect(0, 0, 5, 15);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(x + 22, y + 22);
        this.ctx.rotate(0.3 - Math.sin(this.player.runFrameCount * 0.5) * 0.2);
        this.ctx.fillRect(-2, 0, 5, 15);
        this.ctx.restore();

        this.ctx.fillStyle = '#2c3e50'; 
        if (!this.player.jumping) {
            if (this.player.runFrame === 0) {
                this.ctx.save();
                this.ctx.translate(x + 12, y + 40);
                this.ctx.rotate(-0.2);
                this.ctx.fillRect(0, 0, 6, 20); 
                this.ctx.restore();

                this.ctx.save();
                this.ctx.translate(x + 18, y + 40);
                this.ctx.rotate(0.2);
                this.ctx.fillRect(0, 0, 6, 20); 
                this.ctx.restore();
            } else {
                this.ctx.save();
                this.ctx.translate(x + 12, y + 40);
                this.ctx.rotate(0.2);
                this.ctx.fillRect(0, 0, 6, 20); 
                this.ctx.restore();

                this.ctx.save();
                this.ctx.translate(x + 18, y + 40);
                this.ctx.rotate(-0.2);
                this.ctx.fillRect(0, 0, 6, 20); 
                this.ctx.restore();
            }
        } else {
            this.ctx.save();
            this.ctx.translate(x + 12, y + 40);
            this.ctx.rotate(-0.3);
            this.ctx.fillRect(0, 0, 6, 18); 
            this.ctx.restore();

            this.ctx.save();
            this.ctx.translate(x + 18, y + 40);
            this.ctx.rotate(0.3);
            this.ctx.fillRect(0, 0, 6, 18); 
            this.ctx.restore();
        }
    }

    drawCars() {
        for (const car of this.cars) {
            this.ctx.fillStyle = car.color;
            this.ctx.fillRect(car.x, car.y, car.width, car.height);

            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(car.x + car.width * 0.15, car.y + 5, car.width * 0.3, car.height * 0.4);
            this.ctx.fillRect(car.x + car.width * 0.55, car.y + 5, car.width * 0.3, car.height * 0.4);
            
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(car.x + car.width * 0.2, car.y + car.height, 5, 0, Math.PI * 2);
            this.ctx.arc(car.x + car.width * 0.8, car.y + car.height, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGround();
        this.drawPlayer();
        this.drawCars();
    }

    gameLoop(timestamp) {
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
        }
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (!this.isGameOver) {
            this.updatePlayer();
            this.updateCars();
            this.checkCollisions();
            this.updateScore();
        }

        this.draw();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
}

window.addEventListener('load', () => {
    new RunnerGame();
});
