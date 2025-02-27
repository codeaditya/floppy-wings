// Global Configuration Object
const config = {
  bird: {
    radius: 15,
    color: "yellow",
    flapStrength: -8,
    gravity: 0.5,
    startX: 50,
  },
  pipe: {
    width: 50,
    gap: 150,
    speed: 2,
    color: "green",
    spawnInterval: 300,
  },
  game: {
    scoreTextColor: "black",
    scoreTextFont: "24px Arial",
    gameOverTextColor: "red",
    gameOverTextFontLarge: "48px Arial",
    gameOverTextFontSmall: "24px Arial",
    highScoreTextColor: "blue",
    highScoreTextFont: "24px Arial",
    scorePadding: 10,
  },
  animation: {
    highScorePulseDuration: 500,
    highScorePulseScale: 1.2,
  },
};

function intersects(rectA, rectB) {
  return (
    rectA.x + rectA.width > rectB.x &&
    rectA.x < rectB.x + rectB.width &&
    rectA.y + rectA.height > rectB.y &&
    rectA.y < rectB.y + rectB.height
  );
}

class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = config.bird.radius;
    this.color = config.bird.color;
    this.velocity = 0;
    this.gravity = config.bird.gravity;
    this.flapStrength = config.bird.flapStrength;
  }

  draw(ctx) {
    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    // Wing
    ctx.beginPath();
    ctx.moveTo(this.x + this.radius, this.y - 2);
    ctx.lineTo(this.x + this.radius + 8, this.y - 6);
    ctx.lineTo(this.x + this.radius, this.y + 4);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x - 5, this.y + this.radius);
    ctx.lineTo(this.x - 10, this.y + this.radius + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x + 5, this.y + this.radius);
    ctx.lineTo(this.x + 10, this.y + this.radius + 10);
    ctx.stroke();
  }

  flap() {
    this.velocity = this.flapStrength;
  }

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
  }
}

class Pipe {
  constructor(x, topHeight, canvasHeight) {
    this.x = x;
    this.topHeight = topHeight;
    this.canvasHeight = canvasHeight;
    this.width = config.pipe.width;
    this.gap = config.pipe.gap;
    this.speed = config.pipe.speed;
    this.color = config.pipe.color;
    this.passed = false;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    ctx.fillRect(
      this.x,
      this.topHeight + this.gap,
      this.width,
      this.canvasHeight - (this.topHeight + this.gap)
    );
  }

  update() {
    this.x -= this.speed;
  }

  isColliding(bird) {
    const birdRect = {
      x: bird.x - bird.radius,
      y: bird.y - bird.radius,
      width: 2 * bird.radius,
      height: 2 * bird.radius,
    };
    const topPipeRect = {
      x: this.x,
      y: 0,
      width: this.width,
      height: this.topHeight,
    };
    const bottomPipeRect = {
      x: this.x,
      y: this.topHeight + this.gap,
      width: this.width,
      height: this.canvasHeight - (this.topHeight + this.gap),
    };
    return (
      intersects(birdRect, topPipeRect) || intersects(birdRect, bottomPipeRect)
    );
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0; // Make canvas focusable programmatically
    this.ctx = canvas.getContext("2d");
    this.bird = new Bird(config.bird.startX, canvas.height / 2);
    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.animationFrameId = null;
    this.highScore = 0;
    this.isHighScoreAnimating = false;
    this.highScoreCelebrated = false;

    this.loadHighScore();
    this.setupEventListeners();
    this.reset();
  }

  saveHighScore() {
    localStorage.setItem("highScore", this.highScore);
  }

  loadHighScore() {
    const storedHighScore = localStorage.getItem("highScore");
    if (storedHighScore) {
      this.highScore = parseInt(storedHighScore);
    }
  }

  resetHighScore() {
    this.canvas.focus();
    this.highScore = 0;
    localStorage.removeItem("highScore");
    this.drawHighScore();
  }

  reset() {
    this.bird.y = this.canvas.height / 2;
    this.bird.velocity = 0;
    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.isHighScoreAnimating = false;
    this.highScoreCelebrated = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  setupEventListeners() {
    document.addEventListener("mousedown", this.handleInput.bind(this));
    document.addEventListener("keydown", this.handleInput.bind(this));
    const resetButton = document.getElementById("resetHighScore");
    resetButton.addEventListener("click", this.resetHighScore.bind(this));
  }

  handleInput(event) {
    const isRestartInput =
      (this.gameOver && event.type === "mousedown") ||
      (this.gameOver && event.type === "keydown" && event.code === "Space");
    const isFlapInput =
      !this.gameOver &&
      (event.type === "mousedown" ||
        (event.type === "keydown" && event.code === "Space"));

    if (isFlapInput) {
      this.bird.flap();
    } else if (isRestartInput) {
      this.reset();
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  generatePipes() {
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (
      !lastPipe ||
      lastPipe.x < this.canvas.width - config.pipe.spawnInterval
    ) {
      const topPipeHeight =
        Math.random() * (this.canvas.height - config.pipe.gap - 100) + 50;
      this.pipes.push(
        new Pipe(this.canvas.width, topPipeHeight, this.canvas.height)
      );
    }
  }

  checkCollision() {
    if (
      this.bird.y + this.bird.radius > this.canvas.height ||
      this.bird.y - this.bird.radius < 0
    ) {
      return true; // Boundary collision
    }

    for (const pipe of this.pipes) {
      if (pipe.isColliding(this.bird)) {
        return true; // Pipe collision
      }
    }
    return false; // No collision
  }

  updatePipes() {
    for (let i = 0; i < this.pipes.length; i++) {
      const pipe = this.pipes[i];
      pipe.update();

      if (pipe.x + pipe.width < 0) {
        this.removePipe(i);
        i--;
      }
    }
  }

  removePipe(index) {
    this.pipes.splice(index, 1);
  }

  updateScore() {
    for (const pipe of this.pipes) {
      this.checkAndIncrementScore(pipe);
    }
  }

  checkAndIncrementScore(pipe) {
    if (!pipe.passed && this.bird.x > pipe.x + pipe.width) {
      this.score++;
      pipe.passed = true;
    }
  }

  updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
      this.startHighScoreAnimation();
    }
  }

  drawElements() {
    for (const pipe of this.pipes) {
      pipe.draw(this.ctx);
    }
    this.bird.draw(this.ctx);
    this.drawScore();
    this.drawHighScore();
  }

  drawScore() {
    this.ctx.fillStyle = config.game.scoreTextColor;
    this.ctx.font = config.game.scoreTextFont;
    this.ctx.fillText(`Score: ${this.score}`, config.game.scorePadding, 30);
  }

  drawHighScore() {
    this.ctx.save();
    this.ctx.fillStyle = config.game.highScoreTextColor;
    this.ctx.font = config.game.highScoreTextFont;

    // Apply the scaling effect if animating
    if (this.isHighScoreAnimating) {
      const scale =
        1 +
        Math.abs(
          Math.sin(Date.now() / (config.animation.highScorePulseDuration / 2))
        ) *
          (config.animation.highScorePulseScale - 1);
      this.ctx.scale(scale, scale);
    }

    // Draw the text, considering the scale effect
    const textX = this.isHighScoreAnimating
      ? (this.canvas.width - config.game.scorePadding) /
        (1 + (config.animation.highScorePulseScale - 1))
      : this.canvas.width - config.game.scorePadding;
    const textY = this.isHighScoreAnimating
      ? 30 / (1 + (config.animation.highScorePulseScale - 1))
      : 30;

    this.ctx.textAlign = "right";
    this.ctx.fillText(`High Score: ${this.highScore}`, textX, textY);
    this.ctx.restore();
    this.ctx.textAlign = "left";
  }

  startHighScoreAnimation() {
    this.isHighScoreAnimating = true;
    setTimeout(() => {
      this.isHighScoreAnimating = false;
    }, config.animation.highScorePulseDuration);
  }

  celebrateHighScore() {
    if (!this.highScoreCelebrated) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    this.highScoreCelebrated = true;
  }

  drawGameOver() {
    this.ctx.fillStyle = config.game.gameOverTextColor;
    this.ctx.font = config.game.gameOverTextFontLarge;
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "Game Over!",
      this.canvas.width / 2,
      this.canvas.height / 2 - 75
    );
    this.ctx.font = config.game.gameOverTextFontSmall;
    this.ctx.fillText(
      `Score: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 25
    );
    this.ctx.fillText(
      `High Score: ${this.highScore}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 25
    );
    this.ctx.fillText(
      "Click / Tap / Space to Restart",
      this.canvas.width / 2,
      this.canvas.height / 2 + 75
    );
    this.ctx.textAlign = "left";
    if (this.score > 0 && this.score == this.highScore) {
      this.celebrateHighScore();
    }
  }

  update() {
    if (this.gameOver) {
      return;
    }

    this.bird.update();
    this.generatePipes();
    this.updatePipes();
    this.updateScore();
    this.updateHighScore();

    if (this.checkCollision()) {
      this.gameOver = true;
    }
  }

  render() {
    this.clearCanvas();
    this.drawElements();
    if (this.gameOver) {
      this.drawGameOver();
    }
  }

  gameLoop() {
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }
}

const canvas = document.getElementById("gameCanvas");
const game = new Game(canvas);
