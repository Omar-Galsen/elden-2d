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
      "assets/maps/isometric_minimaps/world_isometric_map.png"
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
        `${attackBase}elden2d_slash_${String(i).padStart(2, "0")}.png`
      );
    }
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
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 34, 54, 18, 0x000000, 0.30).setDepth(18);

    // Werewolf enemy
    this.werewolf = this.physics.add.sprite(930, 430, "werewolf_left_1");
    this.werewolf.setScale(0.24);
    this.werewolf.setDepth(19);
    this.werewolf.setCollideWorldBounds(true);
    this.werewolfShadow = this.add.ellipse(this.werewolf.x, this.werewolf.y + 38, 64, 20, 0x000000, 0.32).setDepth(18);
    this.werewolf.maxHp = 140;
    this.werewolf.hp = 140;
    this.werewolf.speed = 105;
    this.werewolf.state = "patrol";
    this.werewolf.attackReady = true;
    this.werewolf.lastAttackTime = 0;
    this.werewolf.patrolOrigin = new Phaser.Math.Vector2(930, 430);
    this.werewolf.patrolTarget = new Phaser.Math.Vector2(820, 520);
    this.werewolf.facing = "left";
    this.werewolf.invulnerable = false;

    this.werewolfHpBg = this.add.rectangle(this.werewolf.x, this.werewolf.y - 78, 90, 9, 0x111111, 0.9)
      .setDepth(40);
    this.werewolfHpBar = this.add.rectangle(this.werewolf.x - 45, this.werewolf.y - 78, 90, 7, 0xaa2222)
      .setOrigin(0, 0.5)
      .setDepth(41);

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

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  createAnimations() {
    ["down", "left", "right", "up"].forEach(dir => {
      this.anims.create({
        key: "walk-" + dir,
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `walk_${dir}_${i + 1}` })),
        frameRate: 12,
        repeat: -1
      });
    });

    ["down", "left", "right", "up"].forEach(dir => {
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

  pointAllowed(x, y) {
    return true;
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

    if (!this.dodging && !this.attacking) {
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

        if (this.pointAllowed(nx, ny)) {
          this.player.setPosition(nx, ny);
        }

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

    this.updateWerewolf(time, delta);

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
    if (this.attacking || this.dodging) return;

    this.attacking = true;
    this.player.anims.stop();
    this.player.setVelocity(0, 0);

    const starts = {
      down: 1,
      left: 5,
      right: 9,
      up: 13
    };

    const firstFrame = starts[this.facing] || 1;
    let frame = 0;

    const showNextFrame = () => {
      if (frame >= 4) {
        this.attacking = false;
        this.player.setTexture("walk_" + this.facing + "_1");
        return;
      }

      const textureKey = "slash_" + (firstFrame + frame);

      if (this.textures.exists(textureKey)) {
        this.player.setTexture(textureKey);
      }

      if (frame === 1) {
        this.tryPlayerHitWerewolf();
      }

      frame += 1;
      this.time.delayedCall(70, showNextFrame);
    };

    showNextFrame();

    // Absolute failsafe: movement always unlocks.
    this.time.delayedCall(420, () => {
      if (this.attacking) {
        this.attacking = false;
        this.player.setTexture("walk_" + this.facing + "_1");
      }
    });
  }

  updateWerewolf(time, delta) {
    if (!this.werewolf || !this.werewolf.active) return;

    const dx = this.player.x - this.werewolf.x;
    const dy = this.player.y - this.werewolf.y;
    const distance = Math.hypot(dx, dy);

    // face player or patrol direction
    const setFacingFromVector = (vx, vy) => {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.werewolf.facing = vx < 0 ? "left" : "right";
      } else {
        this.werewolf.facing = vy < 0 ? "up" : "down";
      }
    };

    if (this.werewolf.state === "attacking" || this.werewolf.state === "recover") {
      this.werewolf.setVelocity(0, 0);
    } else if (distance < 360) {
      this.werewolf.state = "chase";
      setFacingFromVector(dx, dy);

      if (distance > 95) {
        const chase = new Phaser.Math.Vector2(dx, dy * this.isoYScale).normalize();
        this.werewolf.setVelocity(
          chase.x * this.werewolf.speed,
          chase.y * this.werewolf.speed
        );
        this.werewolf.anims.play("werewolf-walk-" + this.werewolf.facing, true);
      } else {
        this.werewolf.setVelocity(0, 0);
        this.werewolf.anims.stop();
        this.startWerewolfTimedAttack();
      }
    } else {
      this.werewolf.state = "patrol";
      const target = this.werewolf.patrolTarget;
      const pdx = target.x - this.werewolf.x;
      const pdy = target.y - this.werewolf.y;
      const pdist = Math.hypot(pdx, pdy);

      if (pdist < 20) {
        if (Phaser.Math.Distance.Between(target.x, target.y, this.werewolf.patrolOrigin.x, this.werewolf.patrolOrigin.y) < 30) {
          this.werewolf.patrolTarget.set(820, 520);
        } else {
          this.werewolf.patrolTarget.copy(this.werewolf.patrolOrigin);
        }
      }

      setFacingFromVector(pdx, pdy);
      const patrol = new Phaser.Math.Vector2(pdx, pdy * this.isoYScale).normalize();
      this.werewolf.setVelocity(patrol.x * 55, patrol.y * 55);
      this.werewolf.anims.play("werewolf-walk-" + this.werewolf.facing, true);
    }

    // HP bar follows enemy
    this.werewolf.setDepth(1000 + this.werewolf.y);
    this.werewolfShadow.setPosition(this.werewolf.x, this.werewolf.y + 38);
    this.werewolfShadow.setDepth(999 + this.werewolf.y);

    this.werewolfHpBg.setPosition(this.werewolf.x, this.werewolf.y - 78);
    this.werewolfHpBar.setPosition(this.werewolf.x - 45, this.werewolf.y - 78);
    this.werewolfHpBar.width = 90 * Math.max(0, this.werewolf.hp / this.werewolf.maxHp);
  }

  startWerewolfTimedAttack() {
    if (!this.werewolf.attackReady || this.werewolf.state === "attacking") return;

    this.werewolf.attackReady = false;
    this.werewolf.state = "attacking";
    this.werewolf.setVelocity(0, 0);
    this.werewolf.anims.stop();

    // brief telegraph before the claw animation
    this.werewolf.setTint(0xff6666);

    this.time.delayedCall(260, () => {
      if (!this.werewolf || !this.werewolf.active) return;

      this.werewolf.clearTint();
      this.playWerewolfAttackFrames(this.werewolf.facing, () => {
        const distance = Phaser.Math.Distance.Between(
          this.werewolf.x, this.werewolf.y,
          this.player.x, this.player.y
        );

        if (distance < 115 && !this.dodging) {
          this.hp = Math.max(0, this.hp - 22);
          this.cameras.main.shake(100, 0.006);
          this.player.setTint(0xff7777);

          this.time.delayedCall(120, () => {
            if (this.player) this.player.clearTint();
          });
        }
      });

      this.time.delayedCall(420, () => {
        if (!this.werewolf || !this.werewolf.active) return;
        this.werewolf.state = "recover";

        this.time.delayedCall(380, () => {
          if (!this.werewolf || !this.werewolf.active) return;
          this.werewolf.state = "chase";
          this.werewolf.setTexture("werewolf_" + this.werewolf.facing + "_1");
        });
      });

      this.time.delayedCall(1200, () => {
        if (this.werewolf && this.werewolf.active) {
          this.werewolf.attackReady = true;
        }
      });
    });
  }

  playWerewolfAttackFrames(direction, onHit) {
    if (!this.werewolf || !this.werewolf.active) return;

    let frame = 1;

    const nextFrame = () => {
      if (!this.werewolf || !this.werewolf.active) return;

      if (frame > 4) {
        this.werewolf.setTexture("werewolf_" + direction + "_1");
        return;
      }

      const key = "werewolf_attack_" + direction + "_" + frame;

      // If the attack sprites have not been pushed yet, keep the enemy functional.
      if (this.textures.exists(key)) {
        this.werewolf.setTexture(key);
      }

      // Damage lands on the third frame.
      if (frame === 3 && onHit) {
        onHit();
      }

      frame += 1;
      this.time.delayedCall(90, nextFrame);
    };

    nextFrame();
  }

  tryPlayerHitWerewolf() {
    if (!this.werewolf || !this.werewolf.active || this.werewolf.invulnerable) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.werewolf.x, this.werewolf.y
    );

    if (distance > 120) return;

    this.werewolf.invulnerable = true;
    this.werewolf.hp -= 35;
    this.werewolf.setTint(0xffffff);

    // knockback
    const knock = new Phaser.Math.Vector2(
      this.werewolf.x - this.player.x,
      this.werewolf.y - this.player.y
    ).normalize();

    this.werewolf.x += knock.x * 24;
    this.werewolf.y += knock.y * 24;

    this.time.delayedCall(120, () => {
      if (this.werewolf && this.werewolf.active) this.werewolf.clearTint();
    });

    this.time.delayedCall(280, () => {
      if (this.werewolf && this.werewolf.active) this.werewolf.invulnerable = false;
    });

    if (this.werewolf.hp <= 0) {
      this.werewolf.destroy();
      this.werewolfShadow.destroy();
      this.werewolfHpBg.destroy();
      this.werewolfHpBar.destroy();

      this.add.text(this.player.x, this.player.y - 90, "LOUP-GAROU DEFEATED", {
        fontFamily: "serif",
        fontSize: "24px",
        color: "#f0d7a2",
        stroke: "#000000",
        strokeThickness: 5
      }).setOrigin(0.5).setDepth(100);
    }
  }

}
