class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.facing = "down";
    this.speed = 230;
    this.dodgeSpeed = 520;
    this.dodging = false;
    this.attacking = false;
    this.stamina = 100;
    this.hp = 100;
    this.isoYScale = 0.58;
  }

  preload() {
    this.load.image(
      "worldMap",
      "assets/maps/isometric_minimaps/world_isometric_map.png?v=crossroads-20261002"
    );

    const playerBase = "assets/sprites/player/";

    ["down", "left", "right", "up"].forEach(dir => {
      const frameCount = 8;
      for (let i = 1; i <= frameCount; i++) {
        this.load.image(
          `walk_${dir}_${i}`,
          `${playerBase}${dir}/walk_${dir}_${String(i).padStart(2, "0")}.png`
        );
      }
    });

    ["down", "left", "right", "up"].forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        this.load.image(`block_${dir}_${i}`,
          `${playerBase}Block/${dir}/block_${dir}_${String(i).padStart(2, "0")}.png`);
      }
    });

    ["down", "left", "right", "up"].forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        this.load.image(`roll_${dir}_${i}`,
          `${playerBase}Roll/${dir}/roll_${dir}_${String(i).padStart(2, "0")}.png`);
      }
    });

    const werewolfBase = "assets/sprites/enemies/werewolf/";
    ["down", "left", "right", "up"].forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        this.load.image(
          `werewolf_${dir}_${i}`,
          `${werewolfBase}werewolf_${dir}_${String(i).padStart(2, "0")}.png`
        );
      }
    });

    const werewolfAttackBase = "assets/sprites/enemies/werewolf/attacks/";
    ["down", "left", "right", "up"].forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        this.load.image(
          `werewolf_attack_${dir}_${i}`,
          `${werewolfAttackBase}werewolf_attack_${dir}_${String(i).padStart(2, "0")}.png`
        );
      }
    });

    // J sword-slash animation frames.
    // Files 01-04 = down, 05-08 = left, 09-12 = right, 13-16 = up.
    const attackBase = "assets/sprites/player/SwordSlash/";
    for (let i = 1; i <= 16; i++) {
      this.load.image(
        `slash_${i}`,
        `${attackBase}elden2d_slash_${String(i).padStart(2, "0")}.png?v=slash-fixed-20261002`
      );
    }

    const pierceBase = "assets/sprites/player/PlayerPierce/";
    for (let i = 1; i <= 16; i++) {
      this.load.image(
        `pierce_${i}`,
        `${pierceBase}player_pierce_${String(i).padStart(2, "0")}.png?v=pierce-20261002`
      );
    }
  }

  create() {
    this.hp = 100;
    this.stamina = 100;
    this.dead = false;
    this.blocking = false;
    this.attacking = false;
    this.dodging = false;
    this.staminaRegenAt = 0;
    this.mapW = 1400;
    this.mapH = 1050;

    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);

    this.map = this.add.image(this.mapW / 2, this.mapH / 2, "worldMap");
    this.map.setDisplaySize(this.mapW, this.mapH);
    this.map.setDepth(0);

    // Start on the open lower road beside the valley camp.
    this.spawnPoint = { x: 540, y: 685 };
    this.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, "walk_down_1");
    this.player.setScale(0.22);
    // Feet-sized bounds stay constant when sword effects change the canvas.
    this.player.body.setSize(110, 90).setOffset(110, 220);
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 34, 54, 18, 0x000000, 0.30).setDepth(18);

    this.werewolves = [];
    const wolfSpawns = [
      { x: 1000, y: 430, patrolX: 1010, patrolY: 510 },
      { x: 450, y: 345, patrolX: 535, patrolY: 350 },
      { x: 1070, y: 550, patrolX: 990, patrolY: 580 },
      { x: 570, y: 800, patrolX: 610, patrolY: 850 },
      { x: 740, y: 900, patrolX: 780, patrolY: 900 },
      { x: 1240, y: 640, patrolX: 1300, patrolY: 675 }
    ];
    wolfSpawns.forEach(spawn => {

    this.werewolf = this.physics.add.sprite(spawn.x, spawn.y, "werewolf_left_1");
    this.werewolf.setScale(0.24);
    this.werewolf.setDepth(19);
    this.werewolf.setCollideWorldBounds(true);
    this.werewolfShadow = this.add.ellipse(this.werewolf.x, this.werewolf.y + 38, 64, 20, 0x000000, 0.32).setDepth(18);
    this.werewolf.maxHp = 140;
    this.werewolf.hp = 140;
    this.werewolf.speed = 75;
    this.werewolf.state = "patrol";
    this.werewolf.attackReady = true;
    this.werewolf.lastAttackTime = 0;
    this.werewolf.patrolOrigin = new Phaser.Math.Vector2(spawn.x, spawn.y);
    this.werewolf.patrolTarget = new Phaser.Math.Vector2(spawn.x + (spawn.patrolX - spawn.x) * 0.45, spawn.y + (spawn.patrolY - spawn.y) * 0.45);
    this.werewolf.facing = "left";
    this.werewolf.invulnerable = false;

    this.werewolfHpBg = this.add.rectangle(this.werewolf.x, this.werewolf.y - 78, 90, 9, 0x111111, 0.9)
      .setDepth(40);
    this.werewolfHpBar = this.add.rectangle(this.werewolf.x - 45, this.werewolf.y - 78, 90, 7, 0xaa2222)
      .setOrigin(0, 0.5)
      .setDepth(41);

    Object.assign(this.werewolf, {
      shadow: this.werewolfShadow, hpBg: this.werewolfHpBg, hpBar: this.werewolfHpBar,
      safePosition: { x: spawn.x, y: spawn.y },
      patrolEnd: new Phaser.Math.Vector2(spawn.x + (spawn.patrolX - spawn.x) * 0.45, spawn.y + (spawn.patrolY - spawn.y) * 0.45)
    });
    this.werewolves.push(this.werewolf);
    });
    this.createAnimations();
    this.createControls();
    this.guardSprite = this.add.sprite(this.player.x, this.player.y + 34, "block_down_1")
      .setOrigin(0.5, 330 / 360).setScale(0.255).setVisible(false);
    this.guardImpactUntil = 0;
    this.rollSprite = this.add.sprite(this.player.x, this.player.y + 34, "roll_down_1")
      .setOrigin(0.5, 340 / 360).setScale(0.255).setVisible(false);
    this.createUI();
    // HUD uses an unzoomed camera so screen coordinates remain visible.
    this.hudCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    const hudObjects = this.children.list.filter(object => object.scrollFactorX === 0);
    this.cameras.main.ignore(hudObjects);
    this.hudCamera.ignore(this.children.list.filter(object => object.scrollFactorX !== 0));

    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.startFollow(this.player, true, 0.10, 0.10);
    this.cameras.main.setZoom(1.7);

    // Hand-traced scenery footprints for the current 1400 x 1050 map.
    this.walkPolys = [
      new Phaser.Geom.Polygon([80,105, 170,105, 310,230, 420,300,
        610,310, 780,250, 1010,350, 1150,300, 1270,130, 1380,155,
        1390,285, 1300,410, 1180,555, 1260,615, 1390,680, 1390,755,
        1250,730, 1060,645, 980,720, 930,850, 830,945, 650,975,
        470,900, 300,805, 130,770, 75,660, 60,535, 250,520,
        430,420, 350,330, 230,270, 115,200])
    ];
    this.blockPolys = [
      // Left ponds and trees beside the upper road.
      new Phaser.Geom.Polygon([80,290, 215,280, 315,330, 390,430, 280,475, 110,465]),
      // Chapel and stairs: keep the road below it clear.
      new Phaser.Geom.Polygon([570,50, 730,50, 805,170, 825,240, 740,270, 660,190]),
      // Central ruined enclosure and its stone pillars.
      new Phaser.Geom.Polygon([685,380, 795,365, 930,435, 930,510, 840,520, 700,470]),
      // Camp tents and fence.
      new Phaser.Geom.Polygon([115,625, 245,590, 360,650, 345,740, 205,765, 110,720]),
      // Tree and rock island in the middle-left.
      new Phaser.Geom.Polygon([345,550, 435,540, 500,610, 475,680, 390,695, 320,650]),
      // Lower rocky island; roads run around both sides.
      new Phaser.Geom.Polygon([650,745, 735,710, 870,735, 960,805, 910,875, 770,875, 650,815]),
      // Right river bank, leaving the bridge corridor open.
      new Phaser.Geom.Polygon([1100,735, 1250,755, 1380,825, 1380,1010, 1170,925, 1050,840])
    ];
    // Choose valid patrol endpoints for every enemy.
    this.werewolves.forEach(enemy => {
      if (!this.pointAllowed(enemy.patrolEnd.x, enemy.patrolEnd.y, 38)) {
        enemy.patrolEnd.copy(enemy.patrolOrigin);
        enemy.patrolTarget.copy(enemy.patrolOrigin);
      }
    });

    this.zoneLabel.setText("AUTUMN CROSSROADS");

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  createAnimations() {
    ["down", "left", "right", "up"].forEach(dir => {
      if (this.anims.exists("walk-" + dir)) return;
      this.anims.create({
        key: "walk-" + dir,
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `walk_${dir}_${i + 1}` })),
        frameRate: 12,
        repeat: -1
      });
    });

    ["down", "left", "right", "up"].forEach(dir => {
      if (this.anims.exists("werewolf-walk-" + dir)) return;
      this.anims.create({
        key: "werewolf-walk-" + dir,
        frames: [1, 2, 3, 4].map(i => ({ key: `werewolf_${dir}_${i}` })),
        frameRate: 7,
        repeat: -1
      });
    });
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
      dodge: "SPACE",
      attack: "J",
      pierce: "K",
      block: "L"
    });

    this.mobile = { up: false, down: false, left: false, right: false };

    const y = this.scale.height - 90;

    const btn = (x, yy, label, radius = 36) => {
      const c = this.add.circle(x, yy, radius, 0x101722, 0.88)
        .setStrokeStyle(2, 0xa18a5b, 0.9)
        .setScrollFactor(0)
        .setDepth(200)
        .setInteractive();

      this.add.text(x, yy, label, {
        fontSize: label.length > 2 ? "13px" : "22px",
        color: "#ead7ad"
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);

      c.on("pointerdown", () => c.setFillStyle(0x55442b, 0.95));
      ["pointerup", "pointerout"].forEach(e => c.on(e, () => c.setFillStyle(0x101722, 0.88)));
      return c;
    };

    [["left", 70, y, "◀"], ["right", 150, y, "▶"], ["up", 110, y - 50, "▲"], ["down", 110, y + 50, "▼"]]
      .forEach(([name, x, yy, label]) => {
        const b = btn(x, yy, label);
        b.on("pointerdown", () => this.mobile[name] = true);
        ["pointerup", "pointerout"].forEach(e => b.on(e, () => this.mobile[name] = false));
      });

    this.attackBtn = btn(this.scale.width - 70, y, "⚔", 42);
    this.dodgeBtn = btn(this.scale.width - 160, y + 15, "ROLL", 38);
    this.pierceBtn = btn(this.scale.width - 70, y - 95, "↑", 36);
    this.add.text(this.scale.width - 70, y - 145, "PIERCE", {
      fontSize: "13px", color: "#fff", stroke: "#000", strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.mobileBlocking = false;
    const blockBtn = btn(this.scale.width - 165, y - 90, "BLOCK", 38);
    blockBtn.on("pointerdown", () => this.mobileBlocking = true);
    ["pointerup", "pointerout"].forEach(e => blockBtn.on(e, () => this.mobileBlocking = false));

    this.attackBtn.on("pointerdown", () => this.attack());
    this.pierceBtn.on("pointerdown", () => this.attack("pierce"));
    this.dodgeBtn.on("pointerdown", () => this.dodge());
  }

  createUI() {
    const fixed = object => object.setScrollFactor(0).setDepth(300);
    const text = (x, y, value, size = 13, color = "#d9c8a3") => fixed(this.add.text(x, y, value, {
      fontFamily: "Georgia, serif", fontSize: `${size}px`, color,
      stroke: "#080b10", strokeThickness: 2
    })).setDepth(304);
    fixed(this.add.rectangle(22, 18, 384, 126, 0x090d14, 0.92).setOrigin(0)
      .setStrokeStyle(1, 0x88724b, 0.9));
    fixed(this.add.rectangle(26, 22, 376, 118, 0x141a23, 0.7).setOrigin(0)
      .setStrokeStyle(1, 0x403828));
    fixed(this.add.circle(58, 53, 22, 0x292219).setStrokeStyle(2, 0xb99a5b));
    text(58, 53, "F", 25, "#edcf86").setOrigin(0.5);
    text(94, 29, "FALLEN VALE", 18, "#f2dfb5");
    this.combatStatus = text(94, 52, "READY", 11, "#9bafa9");
    this.hudBarWidth = 280;
    text(40, 76, "VITALITY", 11);
    this.hpText = text(388, 75, "100 / 100", 12, "#f5b2a7").setOrigin(1, 0);
    this.hpBg = fixed(this.add.rectangle(106, 79, 282, 18, 0x291016).setOrigin(0)
      .setStrokeStyle(1, 0xa18a5b));
    this.hpBar = fixed(this.add.rectangle(107, 80, 280, 16, 0xc34848).setOrigin(0)).setDepth(301);
    text(40, 110, "STAMINA", 11);
    this.staminaText = text(388, 109, "100 / 100", 12, "#b3dcb8").setOrigin(1, 0);
    this.stamBg = fixed(this.add.rectangle(106, 113, 282, 12, 0x12271d).setOrigin(0)
      .setStrokeStyle(1, 0xa18a5b));
    this.stamBar = fixed(this.add.rectangle(107, 114, 280, 10, 0x62a97b).setOrigin(0)).setDepth(301);
    // Values sit above their tracks, keeping the full bar readable.
    this.hpText.setY(62);
    this.staminaText.setY(97);
    fixed(this.add.rectangle(this.scale.width / 2, 37, 310, 46, 0x090d14, 0.82)
      .setStrokeStyle(1, 0x88724b));
    this.zoneLabel = text(this.scale.width / 2, 28, "AUTUMN CROSSROADS", 17, "#ead7ad").setOrigin(0.5, 0);
    text(this.scale.width / 2, 70, "WASD  MOVE   •   J  SLASH   •   K  PIERCE   •   L  GUARD   •   SPACE  ROLL", 11)
      .setOrigin(0.5);
  }

  updateBlock(time, delta) {
    const holding = this.keys.block.isDown || this.mobileBlocking;
    const active = holding && !this.attacking && !this.dodging && this.stamina > 0;
    if (active && !this.blocking) {
      this.player.anims.stop();
      this.guardRaiseAt = time;
    }
    this.blocking = active;
    this.guardSprite.setVisible(active);
    this.player.setVisible(!active && !this.dodging);
    if (!active) return;
    this.player.setVelocity(0, 0);
    this.stamina = Math.max(0, this.stamina - delta * 0.008);
    this.staminaRegenAt = time + 900;
    // Raise, hold, recoil on impact, then settle back into guard.
    const elapsed = time - this.guardRaiseAt;
    const frame = time < this.guardImpactUntil ? 3
      : time < this.guardImpactUntil + 140 && this.guardImpactUntil > 0 ? 4
      : elapsed < 140 ? 1 : 2;
    this.guardSprite.setTexture(`block_${this.facing}_${frame}`);
    this.guardSprite.setPosition(this.player.x, this.player.y + 34);
    this.guardSprite.setDepth(1000 + this.player.y);
  }

  damagePlayer(amount, enemy = null) {
    if (this.dead) return;
    if (this.blocking && enemy && enemy.active) {
      const aim = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[this.facing];
      const dx = enemy.x - this.player.x;
      const dy = (enemy.y - this.player.y) / this.isoYScale;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || (dx * aim[0] + dy * aim[1]) / distance >= 0.5) {
        if (this.stamina >= 15) {
          this.stamina -= 15;
          amount *= 0.2;
          this.guardImpactUntil = this.time.now + 160;
          this.guardSprite.setTexture(`block_${this.facing}_3`);
        } else {
          this.stamina = 0;
          this.blocking = false;
          this.guardSprite.setVisible(false);
          this.player.setVisible(true);
        }
        this.staminaRegenAt = this.time.now + 900;
      }
    }
    this.hp = Math.max(0, this.hp - amount);
    this.hpBar.width = this.hudBarWidth * this.hp / 100;
    this.hpText.setText(`${Math.ceil(this.hp)} / 100`);
    if (this.hp > 0) return;
    this.dead = true;
    this.blocking = false;
    this.guardSprite.setVisible(false);
          this.player.setVisible(true);
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    this.player.setTint(0x777777);
    this.werewolves.forEach(wolf => {
      if (wolf.active) { wolf.setVelocity(0, 0); wolf.anims.stop(); }
    });
    const beforeOverlay = new Set(this.children.list);
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0x000000, 0.65)
      .setScrollFactor(0).setDepth(5000);
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, "YOU DIED", {
      fontFamily: "serif", fontSize: "48px", color: "#bb4444"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5001);
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 30, "RESTART", {
      fontSize: "28px", color: "#ffffff", backgroundColor: "#333333",
      padding: { x: 28, y: 16 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5001).setInteractive()
      .on("pointerdown", () => this.scene.restart());
    this.cameras.main.ignore(this.children.list.filter(object => !beforeOverlay.has(object)));
  }

  pointAllowed(x, y, footOffset = 34) {
    const footY = y + footOffset;
    // Small footprint tests prevent the feet clipping into scenery.
    return [[0, 0], [-8, 0], [8, 0], [0, -5], [0, 5]].every(([ox, oy]) => {
      const px = x + ox, py = footY + oy;
      return this.walkPolys.some(poly => Phaser.Geom.Polygon.Contains(poly, px, py))
        && !this.blockPolys.some(poly => Phaser.Geom.Polygon.Contains(poly, px, py));
    });
  }

  moveOnMap(sprite, x, y, footOffset = 34) {
    const dx = x - sprite.x, dy = y - sprite.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
    for (let i = 0; i < steps; i++) {
      const nx = sprite.x + dx / steps, ny = sprite.y + dy / steps;
      if (this.pointAllowed(nx, ny, footOffset)) sprite.setPosition(nx, ny);
      else if (this.pointAllowed(nx, sprite.y, footOffset)) sprite.setPosition(nx, sprite.y);
      else if (this.pointAllowed(sprite.x, ny, footOffset)) sprite.setPosition(sprite.x, ny);
      else break;
    }
  }

  update(time, delta) {
    if (this.dead) return;
    this.updateBlock(time, delta);
    let dx = 0;
    let dy = 0;

    if (this.keys.left.isDown || this.mobile.left) dx--;
    if (this.keys.right.isDown || this.mobile.right) dx++;
    if (this.keys.up.isDown || this.mobile.up) dy--;
    if (this.keys.down.isDown || this.mobile.down) dy++;

    if (Phaser.Input.Keyboard.JustDown(this.keys.dodge)) this.dodge();
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.attack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.pierce)) this.attack("pierce");

    if (!this.dodging && !this.attacking && !this.blocking) {
      const input = new Phaser.Math.Vector2(dx, dy);

      if (input.lengthSq() > 0) {
        input.normalize();

        // Isometric movement: vertical screen travel is compressed.
        const v = new Phaser.Math.Vector2(
          input.x,
          input.y * this.isoYScale
        ).normalize();

        const step = this.speed * delta / 1000;
        const nx = this.player.x + v.x * step;
        const ny = this.player.y + v.y * step;

        if (Math.abs(input.x) > Math.abs(input.y)) {
          this.facing = input.x < 0 ? "left" : "right";
        } else {
          this.facing = input.y < 0 ? "up" : "down";
        }

        this.moveOnMap(this.player, nx, ny);

        this.player.anims.play("walk-" + this.facing, true);
      } else {
        this.player.anims.stop();
        this.player.setTexture("walk_" + this.facing + "_1");
      }
    }

    // Isometric depth sorting: lower objects render in front.
    this.player.setDepth(1000 + this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 34);
    this.playerShadow.setDepth(999 + this.player.y);

    this.werewolves.forEach(enemy => this.updateWerewolf(time, delta, enemy));

    if (!this.blocking && !this.attacking && !this.dodging && time >= this.staminaRegenAt) {
      this.stamina = Math.min(100, this.stamina + delta * 0.025);
    }
    this.hpBar.width = this.hudBarWidth * (this.hp / 100);
    this.stamBar.width = this.hudBarWidth * (this.stamina / 100);
    this.hpText.setText(`${Math.ceil(this.hp)} / 100`);
    this.staminaText.setText(`${Math.floor(this.stamina)} / 100`);
    this.combatStatus.setText(this.hp <= 25 ? "CRITICAL HEALTH"
      : this.blocking ? "GUARDING" : this.dodging ? "DODGE ROLL"
      : this.attacking ? "ATTACKING" : this.stamina < 25 ? "RECOVERING STAMINA" : "READY");
    this.hpBar.setFillStyle(this.hp <= 25 ? 0xef5a43 : 0xc34848);
    this.stamBar.setFillStyle(this.stamina < 25 ? 0xc29a4d : 0x62a97b);
  }

  dodge() {
    if (this.dead || this.blocking || this.attacking || this.dodging || this.stamina < 25) return;

    this.stamina -= 25;
    this.staminaRegenAt = this.time.now + 900;
    this.dodging = true;

    const dirs = {
      left: new Phaser.Math.Vector2(-1, 0),
      right: new Phaser.Math.Vector2(1, 0),
      up: new Phaser.Math.Vector2(0, -1),
      down: new Phaser.Math.Vector2(0, 1)
    };

    const direction = this.facing;
    const d = dirs[direction];
    const startX = this.player.x;
    const startY = this.player.y;
    const duration = 360;
    const distance = 120;
    const start = this.time.now;

    this.player.anims.stop();
    this.player.setTexture(`walk_${direction}_1`);
    this.player.setVelocity(0, 0);

    this.player.setVisible(false);
    this.rollSprite.setTexture(`roll_${direction}_1`);
    this.rollSprite.setPosition(this.player.x, this.player.y + 34);
    this.rollSprite.setDepth(1000 + this.player.y);
    this.rollSprite.setVisible(true);

    const finishRoll = () => {
      this.rollSprite.setVisible(false);
      this.player.setVisible(true);
      this.player.setTexture(`walk_${direction}_1`);
      this.dodging = false;
    };
    const ev = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.dead || !this.player.active) {
          ev.remove();
          finishRoll();
          return;
        }
        const t = Math.min(1, (this.time.now - start) / duration);
        const travel = 1 - Math.pow(1 - t, 2);
        const nx = Phaser.Math.Clamp(startX + d.x * distance * travel, 28, this.mapW - 28);
        const ny = Phaser.Math.Clamp(startY + d.y * distance * 0.75 * travel, 40, this.mapH - 40);
        this.moveOnMap(this.player, nx, ny);
        const frame = Math.min(4, 1 + Math.floor(t * 4));
        this.rollSprite.setTexture(`roll_${direction}_${frame}`);
        this.rollSprite.setPosition(this.player.x, this.player.y + 34);
        this.rollSprite.setDepth(1000 + this.player.y);
        if (t >= 1) {
          ev.remove();
          finishRoll();
        }
      }
    });
  }

  attack(type = "slash") {
    const cost = type === "pierce" ? 22 : 16;
    if (this.dead || this.blocking || this.attacking || this.dodging || this.stamina < cost) return;
    this.stamina -= cost;
    this.staminaRegenAt = this.time.now + 900;

    const profile = type === "pierce"
      ? { prefix: "pierce", delay: 110, hitFrame: 2, reach: 150, aimDot: 0.75, damage: 45 }
      : { prefix: "slash", delay: 90, hitFrame: 1, reach: 120, aimDot: 0.35, damage: 35 };
    this.attacking = true;
    this.player.anims.stop();
    this.player.setVelocity(0, 0);

    // Capture facing for the entire swing; one timer owns its lifetime.
    const direction = this.facing;
    const starts = { down: 1, left: 5, right: 9, up: 13 };
    const firstFrame = starts[direction];
    const walkScale = this.player.scaleX;
    const walkOrigin = { x: this.player.originX, y: this.player.originY };
    let frame = 0;

    const showNextFrame = () => {
      if (this.dead || !this.player.active) return;
      if (frame === 4) {
        this.player.setTexture(`walk_${direction}_1`);
        this.player.setScale(walkScale);
        this.player.setOrigin(walkOrigin.x, walkOrigin.y);
        this.player.body.setOffset(110, 220);
        this.attacking = false;
        return;
      }
      this.player.setTexture(`${profile.prefix}_${firstFrame + frame}`);
      this.player.setScale(walkScale);
      // Keep the feet at the walking baseline despite the larger sword canvas.
      this.player.setOrigin(0.5, profile.prefix === "pierce" ? 450 / 550 : 308 / 550);
      this.player.body.setOffset(250, profile.prefix === "pierce" ? 362 : 360);
      if (frame === profile.hitFrame) this.tryPlayerHitWerewolf(direction, profile);
      frame++;
    };

    showNextFrame();
    this.time.addEvent({ delay: profile.delay, repeat: 3, callback: showNextFrame });
  }

  updateWerewolf(time, delta, enemy) {
    if (this.dead || !enemy || !enemy.active) return;

    if (!this.pointAllowed(enemy.x, enemy.y, 38)) {
      enemy.setPosition(enemy.safePosition.x, enemy.safePosition.y);
      enemy.setVelocity(0, 0);
    } else {
      enemy.safePosition = { x: enemy.x, y: enemy.y };
    }
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    // face player or patrol direction
    const setFacingFromVector = (vx, vy) => {
      if (Math.abs(vx) > Math.abs(vy)) {
        enemy.facing = vx < 0 ? "left" : "right";
      } else {
        enemy.facing = vy < 0 ? "up" : "down";
      }
    };

    if (enemy.state === "attacking" || enemy.state === "recover") {
      enemy.setVelocity(0, 0);
    } else if (distance < 200) {
      enemy.state = "chase";
      setFacingFromVector(dx, dy);

      if (distance > 95) {
        const chase = new Phaser.Math.Vector2(dx, dy * this.isoYScale).normalize();
        enemy.setVelocity(
          chase.x * enemy.speed,
          chase.y * enemy.speed
        );
        enemy.setFlipX(false);
        enemy.setFlipX(false);
      enemy.anims.play("werewolf-walk-" + enemy.facing, true);
      } else {
        enemy.setVelocity(0, 0);
        enemy.anims.stop();
        this.startWerewolfTimedAttack(enemy);
      }
    } else {
      enemy.state = "patrol";
      const target = enemy.patrolTarget;
      const pdx = target.x - enemy.x;
      const pdy = target.y - enemy.y;
      const pdist = Math.hypot(pdx, pdy);

      if (pdist < 20) {
        if (Phaser.Math.Distance.Between(target.x, target.y, enemy.patrolOrigin.x, enemy.patrolOrigin.y) < 30) {
          enemy.patrolTarget.copy(enemy.patrolEnd);
        } else {
          enemy.patrolTarget.copy(enemy.patrolOrigin);
        }
      }

      setFacingFromVector(pdx, pdy);
      const patrol = new Phaser.Math.Vector2(pdx, pdy * this.isoYScale).normalize();
      enemy.setVelocity(patrol.x * 30, patrol.y * 30);
      enemy.anims.play("werewolf-walk-" + enemy.facing, true);
    }

    // HP bar follows enemy
    enemy.setDepth(1000 + enemy.y);
    enemy.shadow.setPosition(enemy.x, enemy.y + 38);
    enemy.shadow.setDepth(999 + enemy.y);

    enemy.hpBg.setPosition(enemy.x, enemy.y - 78);
    enemy.hpBar.setPosition(enemy.x - 45, enemy.y - 78);
    enemy.hpBar.width = 90 * Math.max(0, enemy.hp / enemy.maxHp);
  }

  startWerewolfTimedAttack(enemy) {
    if (!enemy.attackReady || enemy.state === "attacking") return;

    enemy.attackReady = false;
    enemy.state = "attacking";

    // Lock facing toward the player at the instant the attack begins.
    const attackDx = this.player.x - enemy.x;
    const attackDy = this.player.y - enemy.y;
    if (Math.abs(attackDx) > Math.abs(attackDy)) {
      enemy.facing = attackDx < 0 ? "left" : "right";
    } else {
      enemy.facing = attackDy < 0 ? "up" : "down";
    }

    enemy.setVelocity(0, 0);
    enemy.anims.stop();

    // brief telegraph before the claw animation
    enemy.setTint(0xff6666);

    this.time.delayedCall(260, () => {
      if (this.dead || !enemy || !enemy.active) return;

      enemy.clearTint();
      this.playWerewolfAttackFrames(enemy.facing, () => {
        const distance = Phaser.Math.Distance.Between(
          enemy.x, enemy.y,
          this.player.x, this.player.y
        );

        if (distance < 115 && !this.dodging) {
          this.damagePlayer(22, enemy);
          this.cameras.main.shake(100, 0.006);
          this.player.setTint(0xff7777);

          this.time.delayedCall(120, () => {
            if (this.player) this.player.clearTint();
          });
        }
      }, enemy);

      this.time.delayedCall(420, () => {
        if (this.dead || !enemy || !enemy.active) return;
        enemy.state = "recover";

        this.time.delayedCall(380, () => {
          if (this.dead || !enemy || !enemy.active) return;
          enemy.state = "chase";
          enemy.setTexture("werewolf_" + enemy.facing + "_1");
        });
      });

      this.time.delayedCall(1200, () => {
        if (enemy && enemy.active) {
          enemy.attackReady = true;
        }
      });
    });
  }

  playWerewolfAttackFrames(direction, onHit, enemy) {
    if (this.dead || !enemy || !enemy.active) return;

    let frame = 1;

    const nextFrame = () => {
      if (this.dead || !enemy || !enemy.active) return;

      if (frame > 4) {
        enemy.setFlipX(false);
        enemy.setTexture("werewolf_" + direction + "_1");
        return;
      }

      // The generated side-attack art faces right in both side rows.
      // Use the right-facing attack frames as the master set and mirror
      // them when the player is on the wolf's left.
      const attackDirection =
        direction === "left" || direction === "right"
          ? "right"
          : direction;

      enemy.setFlipX(direction === "left");

      const key = "werewolf_attack_" + attackDirection + "_" + frame;

      if (this.textures.exists(key)) {
        enemy.setTexture(key);
      }

      if (frame === 3 && onHit) {
        onHit();
      }

      frame += 1;
      this.time.delayedCall(90, nextFrame);
    };

    nextFrame();
  }

  tryPlayerHitWerewolf(direction = this.facing, profile = { reach: 120, aimDot: 0.35, damage: 35 }, enemy = null) {
    if (!enemy) {
      this.werewolves.forEach(wolf => this.tryPlayerHitWerewolf(direction, profile, wolf));
      return;
    }
    if (!enemy || !enemy.active || enemy.invulnerable) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      enemy.x, enemy.y
    );

    if (distance > profile.reach) return;
    const targetX = enemy.x - this.player.x;
    // Compare facing in the same isometric coordinates used for movement.
    const targetY = (enemy.y - this.player.y) / this.isoYScale;
    const aimDistance = Math.hypot(targetX, targetY);
    const aim = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    if (aimDistance > 0 && (targetX * aim[0] + targetY * aim[1]) / aimDistance < profile.aimDot) return;

    enemy.invulnerable = true;
    enemy.hp -= profile.damage;
    enemy.setTint(0xffffff);

    // knockback
    const knock = new Phaser.Math.Vector2(
      enemy.x - this.player.x,
      enemy.y - this.player.y
    ).normalize();

    this.moveOnMap(enemy, enemy.x + knock.x * 24, enemy.y + knock.y * 24, 38);

    this.time.delayedCall(120, () => {
      if (enemy && enemy.active) enemy.clearTint();
    });

    this.time.delayedCall(280, () => {
      if (enemy && enemy.active) enemy.invulnerable = false;
    });

    if (enemy.hp <= 0) {
      enemy.destroy();
      enemy.shadow.destroy();
      enemy.hpBg.destroy();
      enemy.hpBar.destroy();

      const defeatedLabel = this.add.text(this.player.x, this.player.y - 90, "LOUP-GAROU DEFEATED", {
        fontFamily: "serif",
        fontSize: "24px",
        color: "#f0d7a2",
        stroke: "#000000",
        strokeThickness: 5
      }).setOrigin(0.5).setDepth(100);
      this.hudCamera.ignore(defeatedLabel);
    }
  }

}
