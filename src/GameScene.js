class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.zoneIndex = 0;
    this.facing = "down";
    this.speed = 230;
    this.dodgeSpeed = 520;
    this.dodging = false;
    this.stamina = 100;
    this.hp = 100;
  }

  preload() {
    const mapBase = "assets/maps/isometric_minimaps/";
    const playerBase = "assets/sprites/player/";

    [
      "01_gothic_chapel_graveyard.png",
      "02_ruined_chapel_foggy_chasm.png",
      "03_fortress_bridge_waterfalls.png",
      "04_gothic_marshland_ruins.png",
      "05_crimson_falls_fortress_pass.png",
      "06_fortress_gate_boss_arena.png"
    ].forEach((f, i) => this.load.image("map" + i, mapBase + f));

    ["down","left","right","up"].forEach(dir => {
      for (let i = 1; i <= 4; i++) {
        this.load.image(`walk_${dir}_${i}`, playerBase + `walk_${dir}_${String(i).padStart(2,"0")}.png`);
      }
    });
  }

  create() {
    this.mapNames = [
      "Chapel Graveyard",
      "Sacred Ruins",
      "Bridge of Falls",
      "Drowned Marsh",
      "Crimson Pass",
      "Fortress Gate"
    ];

    this.walkPolys = [
      [[120,210],[540,160],[735,250],[805,510],[1190,690],[1190,900],[990,930],[760,760],[600,650],[390,650],[170,560]],
      [[120,930],[270,790],[450,760],[550,640],[650,520],[735,365],[875,250],[1110,140],[1190,300],[970,450],[850,620],[740,810],[520,990],[270,1080]],
      [[100,760],[260,620],[450,560],[560,450],[710,450],[850,310],[1110,180],[1190,390],[950,500],[850,650],[690,700],[540,810],[330,930],[120,930]],
      [[90,780],[270,650],[450,680],[600,560],[740,430],[930,290],[1180,260],[1180,490],[980,560],[820,700],[650,820],[430,900],[220,940]],
      [[80,880],[290,760],[430,680],[520,540],[650,440],[770,320],[900,190],[1160,120],[1180,360],[980,430],[850,560],[730,690],[570,820],[350,940],[120,1010]],
      [[80,870],[320,730],[540,640],[690,520],[820,420],[970,300],[1160,220],[1180,520],[1020,620],[820,690],[650,780],[450,900],[220,1010]]
    ].map(points => points.map(([x,y]) => new Phaser.Math.Vector2(x,y)));

    this.spawnPoints = [
      {x:250,y:500},{x:180,y:900},{x:160,y:860},
      {x:150,y:820},{x:140,y:920},{x:140,y:920}
    ];

    this.exitPoints = [
      {x:1120,y:760},{x:1050,y:260},{x:1080,y:260},
      {x:1080,y:300},{x:1080,y:220},{x:1020,y:300}
    ];

    this.map = this.add.image(627,627,"map0").setDepth(0);
    this.physics.world.setBounds(0,0,1254,1254);

    this.player = this.physics.add.sprite(250,500,"walk_down_1")
      .setScale(0.22)
      .setDepth(20)
      .setCollideWorldBounds(true);

    this.createAnimations();
    this.createControls();
    this.createUI();

    this.cameras.main.setBounds(0,0,1254,1254);
    this.cameras.main.startFollow(this.player,true,0.10,0.10);
    this.cameras.main.setZoom(1.65);

    this.zoneLabel.setText(this.mapNames[this.zoneIndex]);
    this.cameras.main.fadeIn(450,0,0,0);
  }

  createAnimations() {
    ["down","left","right","up"].forEach(dir => {
      this.anims.create({
        key: "walk-" + dir,
        frames: [1,2,3,4].map(i => ({ key: `walk_${dir}_${i}` })),
        frameRate: 8,
        repeat: -1
      });
    });
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      up:"W", down:"S", left:"A", right:"D",
      dodge:"SPACE", attack:"J"
    });

    this.mobile = {up:false,down:false,left:false,right:false};
    const y = this.scale.height - 90;

    const btn = (x, yy, label, radius=36) => {
      const c = this.add.circle(x,yy,radius,0x000000,0.48)
        .setScrollFactor(0).setDepth(200).setInteractive();
      this.add.text(x,yy,label,{fontSize:"22px",color:"#fff"})
        .setOrigin(0.5).setScrollFactor(0).setDepth(201);
      return c;
    };

    [["left",70,y,"◀"],["right",150,y,"▶"],["up",110,y-50,"▲"],["down",110,y+50,"▼"]]
      .forEach(([name,x,yy,label]) => {
        const b = btn(x,yy,label);
        b.on("pointerdown",()=>this.mobile[name]=true);
        ["pointerup","pointerout"].forEach(e=>b.on(e,()=>this.mobile[name]=false));
      });

    this.attackBtn = btn(this.scale.width-70,y,"⚔",42);
    this.dodgeBtn = btn(this.scale.width-160,y+15,"↯",38);
    this.attackBtn.on("pointerdown",()=>this.attack());
    this.dodgeBtn.on("pointerdown",()=>this.dodge());
  }

  createUI() {
    this.zoneLabel = this.add.text(this.scale.width/2,24,"",{
      fontFamily:"serif",fontSize:"22px",color:"#e7d9ad",stroke:"#000",strokeThickness:4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    this.hpBg = this.add.rectangle(18,24,210,16,0x111111,0.85).setOrigin(0).setScrollFactor(0).setDepth(300);
    this.hpBar = this.add.rectangle(18,24,210,16,0x8f2626).setOrigin(0).setScrollFactor(0).setDepth(301);
    this.stamBg = this.add.rectangle(18,47,210,11,0x111111,0.85).setOrigin(0).setScrollFactor(0).setDepth(300);
    this.stamBar = this.add.rectangle(18,47,210,11,0x4a9d55).setOrigin(0).setScrollFactor(0).setDepth(301);
  }

  pointAllowed(x,y) {
    return Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(this.walkPolys[this.zoneIndex]),x,y);
  }

  update(time, delta) {
    let dx = 0, dy = 0;
    if (this.keys.left.isDown || this.mobile.left) dx--;
    if (this.keys.right.isDown || this.mobile.right) dx++;
    if (this.keys.up.isDown || this.mobile.up) dy--;
    if (this.keys.down.isDown || this.mobile.down) dy++;

    if (Phaser.Input.Keyboard.JustDown(this.keys.dodge)) this.dodge();
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.attack();

    if (!this.dodging) {
      const v = new Phaser.Math.Vector2(dx,dy);
      if (v.lengthSq() > 0) {
        v.normalize();
        const step = this.speed * delta / 1000;
        const nx = this.player.x + v.x * step;
        const ny = this.player.y + v.y * step;

        if (Math.abs(v.x) > Math.abs(v.y)) this.facing = v.x < 0 ? "left" : "right";
        else this.facing = v.y < 0 ? "up" : "down";

        if (this.pointAllowed(nx,ny)) this.player.setPosition(nx,ny);
        this.player.anims.play("walk-" + this.facing,true);
      } else {
        this.player.anims.stop();
        this.player.setTexture("walk_" + this.facing + "_1");
      }
    }

    this.stamina = Math.min(100,this.stamina + delta*0.018);
    this.hpBar.width = 210*(this.hp/100);
    this.stamBar.width = 210*(this.stamina/100);

    const exit = this.exitPoints[this.zoneIndex];
    if (Phaser.Math.Distance.Between(this.player.x,this.player.y,exit.x,exit.y) < 85) this.nextZone();
  }

  dodge() {
    if (this.dodging || this.stamina < 25) return;
    this.stamina -= 25;
    this.dodging = true;

    const dirs = {
      left:new Phaser.Math.Vector2(-1,0), right:new Phaser.Math.Vector2(1,0),
      up:new Phaser.Math.Vector2(0,-1), down:new Phaser.Math.Vector2(0,1)
    };
    const d = dirs[this.facing];
    const startX=this.player.x, startY=this.player.y;
    const duration=170, start=this.time.now;

    const ev = this.time.addEvent({
      delay:16, loop:true,
      callback:()=>{
        const t=Math.min(1,(this.time.now-start)/duration);
        const nx=startX+d.x*this.dodgeSpeed*(duration/1000)*t;
        const ny=startY+d.y*this.dodgeSpeed*(duration/1000)*t;
        if(this.pointAllowed(nx,ny)) this.player.setPosition(nx,ny);
        if(t>=1){ ev.remove(); this.dodging=false; }
      }
    });
  }

  attack() {
    if (this.attackFx) return;
    this.attackFx = this.add.arc(this.player.x,this.player.y,60,315,45,false,0xffd36a,0.65).setDepth(19);
    this.tweens.add({
      targets:this.attackFx, angle:90, alpha:0, duration:150,
      onComplete:()=>{ this.attackFx.destroy(); this.attackFx=null; }
    });
  }

  nextZone() {
    if (this.transitioning) return;
    this.transitioning = true;

    if (this.zoneIndex >= 5) {
      this.zoneLabel.setText("FORTRESS GATE — BOSS AREA");
      this.time.delayedCall(900,()=>this.transitioning=false);
      return;
    }

    this.cameras.main.fadeOut(250,0,0,0);
    this.time.delayedCall(260,()=>{
      this.zoneIndex++;
      this.map.setTexture("map"+this.zoneIndex);
      const s=this.spawnPoints[this.zoneIndex];
      this.player.setPosition(s.x,s.y);
      this.zoneLabel.setText(this.mapNames[this.zoneIndex]);
      this.cameras.main.fadeIn(300,0,0,0);
      this.transitioning=false;
    });
  }
}