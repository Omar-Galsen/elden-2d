class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.facing = "down";
    this.speed = 230;
    this.dodgeSpeed = 520;
    this.dodging = false;
    this.stamina = 100;
    this.hp = 100;
  }

  preload() {
    this.load.image(
      "worldMap",
      "assets/maps/isometric_minimaps/world_isometric_map.png"
    );

    const playerBase = "assets/sprites/player/";

    ["down", "left", "right", "up"].forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        this.load.image(
          `walk_${dir}_${i}`,
          `${playerBase}walk_${dir}_${String(i).padStart(2, "0")}.png`
        );
      }
    });
  }

  create() {
    this.mapW = 1400;
    this.mapH = 1050;

    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);

    this.map = this.add.image(this.mapW / 2, this.mapH / 2, "worldMap");
    this.map.setDisplaySize(this.mapW, this.mapH);
    this.map.setDepth(0);

    // Start on the open circular graveyard plaza, away from tombstones/cliffs.
    this.spawnPoint = { x: 245, y: 665 };
    this.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, "walk_down_1");
    this.player.setScale(0.22);
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);

    this.createAnimations();
    this.createControls();
    this.createUI();

    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.startFollow(this.player, true, 0.10, 0.10);
    this.cameras.main.setZoom(1.7);

    // Walkable areas are split into clean regions so the spawn plaza is valid
    // and the player does not begin inside blocked scenery.
    this.walkPolys = [
      new Phaser.Geom.Polygon([
        120,610,
        300,590,
        410,640,
        420,735,
        345,800,
        175,800,
        95,725,
        90,650
      ]),

      // Stair + landing connector from the graveyard plaza to the lower road.
      // This overlaps both neighboring walkable regions so the player
      // cannot get trapped at the stair transition.
      new Phaser.Geom.Polygon([
        300,700,
        430,690,
        535,770,
        565,835,
        500,910,
        365,875,
        285,805
      ]),

      // Wide lower-road corridor. This intentionally overlaps the stair
      // landing and the main route so there are no narrow "seams" that
      // trap the player between polygons.
      new Phaser.Geom.Polygon([
        300,650,
        520,620,
        760,650,
        1030,720,
        1260,805,
        1320,940,
        1180,1010,
        900,950,
        650,900,
        430,850,
        300,780
      ]),

      new Phaser.Geom.Polygon([
      120,920,
      260,860,
      430,760,
      620,700,
      760,610,
      900,520,
      1030,420,
      1160,300,
      1290,180,
      1350,120,

      1360,260,
      1270,340,
      1160,430,
      1040,520,
      920,610,
      780,690,
      650,760,
      470,830,
      300,930,
      150,980,

      120,920
      ])
    ];

    this.zoneLabel.setText("ISOMETRIC WORLD");

    // Press C to visualize walkable collision regions while tuning the map.
    this.collisionDebug = this.add.graphics().setDepth(500);
    this.collisionDebugVisible = false;
    this.input.keyboard.on("keydown-C", () => {
      this.collisionDebugVisible = !this.collisionDebugVisible;
      this.drawCollisionDebug();
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  createAnimations() {
    ["down", "left", "right", "up"].forEach(dir => {
      this.anims.create({
        key: "walk-" + dir,
        frames: [1, 2, 3, 4].map(i => ({ key: `walk_${dir}_${i}` })),
        frameRate: 8,
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
      attack: "J"
    });

    this.mobile = { up: false, down: false, left: false, right: false };

    const y = this.scale.height - 90;

    const btn = (x, yy, label, radius = 36) => {
      const c = this.add.circle(x, yy, radius, 0x000000, 0.48)
        .setScrollFactor(0)
        .setDepth(200)
        .setInteractive();

      this.add.text(x, yy, label, {
        fontSize: "22px",
        color: "#fff"
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);

      return c;
    };

    [["left", 70, y, "◀"], ["right", 150, y, "▶"], ["up", 110, y - 50, "▲"], ["down", 110, y + 50, "▼"]]
      .forEach(([name, x, yy, label]) => {
        const b = btn(x, yy, label);
        b.on("pointerdown", () => this.mobile[name] = true);
        ["pointerup", "pointerout"].forEach(e => b.on(e, () => this.mobile[name] = false));
      });

    this.attackBtn = btn(this.scale.width - 70, y, "⚔", 42);
    this.dodgeBtn = btn(this.scale.width - 160, y + 15, "↯", 38);

    this.attackBtn.on("pointerdown", () => this.attack());
    this.dodgeBtn.on("pointerdown", () => this.dodge());
  }

  createUI() {
    this.zoneLabel = this.add.text(this.scale.width / 2, 24, "", {
      fontFamily: "serif",
      fontSize: "22px",
      color: "#e7d9ad",
      stroke: "#000",
      strokeThickness: 4
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300);

    this.hpBg = this.add.rectangle(18, 24, 210, 16, 0x111111, 0.85)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(300);

    this.hpBar = this.add.rectangle(18, 24, 210, 16, 0x8f2626)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(301);

    this.stamBg = this.add.rectangle(18, 47, 210, 11, 0x111111, 0.85)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(300);

    this.stamBar = this.add.rectangle(18, 47, 210, 11, 0x4a9d55)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(301);
  }

  drawCollisionDebug() {
    this.collisionDebug.clear();
    if (!this.collisionDebugVisible) return;

    this.collisionDebug.fillStyle(0x00ff66, 0.20);
    this.collisionDebug.lineStyle(3, 0x00ff66, 0.9);

    this.walkPolys.forEach(poly => {
      this.collisionDebug.fillPoints(poly.points, true);
      this.collisionDebug.strokePoints(poly.points, true);
    });
  }

  pointAllowed(x, y) {
    return this.walkPolys.some(poly => Phaser.Geom.Polygon.Contains(poly, x, y));
  }

  update(time, delta) {
    let dx = 0;
    let dy = 0;

    if (this.keys.left.isDown || this.mobile.left) dx--;
    if (this.keys.right.isDown || this.mobile.right) dx++;
    if (this.keys.up.isDown || this.mobile.up) dy--;
    if (this.keys.down.isDown || this.mobile.down) dy++;

    if (Phaser.Input.Keyboard.JustDown(this.keys.dodge)) this.dodge();
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.attack();

    if (!this.dodging) {
      const v = new Phaser.Math.Vector2(dx, dy);

      if (v.lengthSq() > 0) {
        v.normalize();

        const step = this.speed * delta / 1000;
        const nx = this.player.x + v.x * step;
        const ny = this.player.y + v.y * step;

        if (Math.abs(v.x) > Math.abs(v.y)) {
          this.facing = v.x < 0 ? "left" : "right";
        } else {
          this.facing = v.y < 0 ? "up" : "down";
        }

        if (this.pointAllowed(nx, ny)) {
          this.player.setPosition(nx, ny);
        }

        this.player.anims.play("walk-" + this.facing, true);
      } else {
        this.player.anims.stop();
        this.player.setTexture("walk_" + this.facing + "_1");
      }
    }

    this.stamina = Math.min(100, this.stamina + delta * 0.018);
    this.hpBar.width = 210 * (this.hp / 100);
    this.stamBar.width = 210 * (this.stamina / 100);
  }

  dodge() {
    if (this.dodging || this.stamina < 25) return;

    this.stamina -= 25;
    this.dodging = true;

    const dirs = {
      left: new Phaser.Math.Vector2(-1, 0),
      right: new Phaser.Math.Vector2(1, 0),
      up: new Phaser.Math.Vector2(0, -1),
      down: new Phaser.Math.Vector2(0, 1)
    };

    const d = dirs[this.facing];
    const startX = this.player.x;
    const startY = this.player.y;
    const duration = 170;
    const start = this.time.now;

    const ev = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = Math.min(1, (this.time.now - start) / duration);
        const nx = startX + d.x * this.dodgeSpeed * (duration / 1000) * t;
        const ny = startY + d.y * this.dodgeSpeed * (duration / 1000) * t;

        if (this.pointAllowed(nx, ny)) {
          this.player.setPosition(nx, ny);
        }

        if (t >= 1) {
          ev.remove();
          this.dodging = false;
        }
      }
    });
  }

  attack() {
    if (this.attackFx) return;

    this.attackFx = this.add.arc(
      this.player.x,
      this.player.y,
      60,
      315,
      45,
      false,
      0xffd36a,
      0.65
    ).setDepth(19);

    this.tweens.add({
      targets: this.attackFx,
      angle: 90,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.attackFx.destroy();
        this.attackFx = null;
      }
    });
  }
}
