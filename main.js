const canvas = document.getElementById("canvas")

function millToRad(mill){
  return mill * 2 * Math.PI / 6400;
}

function radToMill(rad){
  return rad * 6400 / (2 * Math.PI);
}

class DrawManage{
  constructor(system, viewport){
    this.viewport = viewport
    this.canvas = this.viewport.canvas;
    this.system = system;
    this.ctx = this.canvas.getContext('2d');

    this.camera = this.system.camera;
    
    this.lineWidth= this.viewport.strLineWidth * this.camera.zoom;
    
    this.objScale = 10;
    
    this.worldToCanvasMatrix = this.buildWorldToCanvasMatrix();
    this.cameraMatrix = this.buildCameraMatrix();
  }

  buildWorldToCanvasMatrix(){
    const T = math.matrix([
      [1, 0, this.viewport.centerX],   // CSS px 기준
      [0, 1, this.viewport.centerY],
      [0, 0, 1]
    ]);

    const S = math.matrix([
      [ this.viewport.pixelPerGrid, 0, 0],
      [ 0,-this.viewport.pixelPerGrid, 0], // y 뒤집기 포함
      [ 0, 0, 1]
    ]);

    return math.multiply(T, S);
  }
  

  buildCameraMatrix(){
    const T = math.matrix([
      [1, 0, -this.camera.x],
      [0, 1, -this.camera.y],
      [0, 0, 1]
    ]);
  
    
    const S = math.matrix([
      [this.camera.zoom, 0, 0],
      [0, this.camera.zoom, 0],
      [0, 0, 1]
    ]);
    
    return math.multiply(S, T);
  }
  

  clear(){
    this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
  }
  
  drawGrid(){
    const invT = math.inv(math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix()
    ))
    
    const cp0 = math.multiply(
      invT,
      math.matrix([
        [0],
        [0],
        [1]
      ])
    )
    
    const cp1 = math.multiply(
      invT,
      math.matrix([
        [this.viewport.width],
        [this.viewport.height],
        [1]
      ])
    )
    
    const wx = [cp0.get([0,0]), cp1.get([0,0])]
    const wy = [cp0.get([1,0]), cp1.get([1,0])]
    
    const minX = Math.min(wx[0], wx[1]);
    const maxX = Math.max(wx[0], wx[1]);
    const minY = Math.min(wy[0], wy[1]);
    const maxY = Math.max(wy[0], wy[1]);
    
    const toSX = wx => this.viewport.centerX + (wx - this.camera.x) * this.camera.zoom * this.viewport.pixelPerGrid
    const toSY = wy => this.viewport.centerY - (wy - this.camera.y) * this.camera.zoom * this.viewport.pixelPerGrid
    
    const minPx = 5;
    
    const maxLinePerAxis = 2000;
    
    for(let level = 0; level < 8; level++){
      let step = Math.pow(10, level)
      
      let stepPx = step * this.camera.zoom * this.viewport.pixelPerGrid;
      
      if(stepPx < minPx) continue;
      
      const x0 = Math.floor(minX/step)*step
      const x1 = Math.ceil(maxX/step)*step
      const y0 = Math.floor(minY/step)*step
      const y1 = Math.ceil(maxY/step)*step
      
      this.ctx.lineWidth = 1.25;
      this.ctx.strokeStyle = "#00000030"
      
      for(let x = x0; x < x1; x += step){
        if(x<0 || x>99999) continue
        const sx = Math.round(toSX(x)) +0.5
        this.ctx.beginPath();
        this.ctx.moveTo(sx,0);
        this.ctx.lineTo(sx,this.viewport.height);
        this.ctx.stroke()
      }
      
      for(let y = y0; y < y1; y += step){
        if(y<0 || y>99999) continue
        const sy = Math.round(toSY(y)) +0.5
        this.ctx.beginPath();
        this.ctx.moveTo(0, sy);
        this.ctx.lineTo(this.viewport.width, sy);
        this.ctx.stroke()
      }
    }
    
    //console.log(wx, wy)
  }
  
  drawAxis(){
    const cx = this.viewport.centerX;
    const cy = this.viewport.centerY;
    
    const axisSize = 10;
    
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(cx - axisSize, cy);
    this.ctx.lineTo(cx + axisSize, cy);
    this.ctx.stroke();
    this.ctx.closePath();
    
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - axisSize);
    this.ctx.lineTo(cx, cy + axisSize);
    this.ctx.stroke();
    this.ctx.closePath();
  }
  
  drawPos(){
    const x = this.camera.x;
    const y = this.camera.y;
    
    const obj = this.system.selectedObject;
    
    const ox = obj?obj.x:0;
    const oy = obj?obj.y:0;
    
    const dx = x - ox;
    const dy = y - oy;
    
    const offset = 20;
    
    
    const dist = Math.sqrt(dx**2 + dy**2);
    const distText = obj ? " ("+dist.toFixed(3)+"m)" : ""
    
    this.ctx.fillStyle = "black";
    this.ctx.font = "15px noto-sans";
    this.ctx.textAlign = "center"
    this.ctx.fillText(Math.floor(dx) + " " + Math.floor(dy) + distText, this.viewport.centerX, this.viewport.centerY + offset);
  }
  
  drawMill(){
    const obj = this.system.selectedObject;
    if(!obj) return;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]);
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    
    const x0 = convertedPos.get([0,0]);
    const y0 = convertedPos.get([1,0]);
    
    const x1 = this.viewport.centerX;
    const y1 = this.viewport.centerY;
    
    const mill = 1600 - radToMill(Math.atan2(y0 - y1, x1 - x0))
    
    const offset = 40;
    
    this.ctx.fillStyle = "black";
    this.ctx.font = "15px noto-sans";
    this.ctx.textAlign = "center"
    this.ctx.fillText(Math.floor(mill) + " mill", this.viewport.centerX, this.viewport.centerY + offset);
  }
  
  drawObjects(){
    this.cameraMatrix = this.buildCameraMatrix();
    this.lineWidth = this.viewport.strLineWidth * this.camera.zoom
    
    this.drawSelectedObject();
    this.drawselectedObjToAxisLine()
    
    for(const obj of this.system.objects){
      if(obj.type == "mortar"){
        this.drawAngleLine(obj)
        this.drawMortar(obj)
      }
      else if(obj.type == "farbar"){
        this.drawFarbar(obj);
      }
      else if (obj.type == "nearbar") {
        this.drawNearbar(obj)
      }
      else if(obj.type == "stdbar") {
        this.drawStdbarAngleLine(obj)
        this.drawStdbar(obj)
      }
      else if(obj.type == "target"){
        this.drawTarget(obj)
      }
      else if(obj.type == "observer"){
        this.drawObserver(obj)
      }
    }
  }
  
  drawselectedObjToAxisLine(){
    const obj = this.system.selectedObject;
    if(!obj) return;
    
    const cx = obj.x
    const cy = obj.y
    
    const centerMatrix = math.matrix([[cx],[cy],[1]]);
    
    const mortarAngle = millToRad(obj.declination);
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      centerMatrix
    );
    
    
    let x0 = convertedPos.get([0,0])
    let y0 = convertedPos.get([1,0])
    let x1 = this.viewport.centerX
    let y1 = this.viewport.centerY
    
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#000000ff'
    this.ctx.setLineDash([2,2])
    this.ctx.beginPath();
    this.ctx.moveTo(x0,y0);
    this.ctx.lineTo(x1,y1);
    this.ctx.stroke()
    
    this.ctx.setLineDash([])
  }
  
  drawAngleLine(obj){
    const cx = obj.x
    const cy = obj.y
    
    const centerMatrix = math.matrix([[cx],[cy],[1]]);
    
    const sightPos = {x : -0.15, y : 0.3}
    const sightMatrix = math.matrix([[sightPos.x],[sightPos.y],[1]])
    const scale = this.objScale;
    const scaleMatrix = math.matrix([
      [scale, 0, 0],
      [0, scale, 0],
      [0, 0, 1]
    ])
    const mortarAngle = millToRad(obj.declination);
    const sightAngle = Math.PI + millToRad(obj.sightangle) + mortarAngle;
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      
      centerMatrix
    );
    
    const pos = math.matrix([
      [1,0,obj.x],
      [0,1,obj.y],
      [0,0,1]
    ]); //박격포 중심의 위치
    const angleMatrix = math.matrix([
      [Math.cos(-mortarAngle), -Math.sin(-mortarAngle), 0],
      [Math.sin(-mortarAngle), Math.cos(-mortarAngle), 0],
      [0,0,1]
    ])
    const convertedSightPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos,
      angleMatrix,
      scaleMatrix,
      sightMatrix
    );
    
    let l = obj.intersection * this.system.camera.zoom * this.viewport.pixelPerGrid
    let x0 = convertedPos.get([0,0])
    let y0 = convertedPos.get([1,0])
    let x1 = x0 + l * Math.sin(mortarAngle)
    let y1 = y0 - l * Math.cos(mortarAngle)
    
    this.ctx.lineWidth = 4
    this.ctx.strokeStyle = '#00000077'
    this.ctx.setLineDash([5,2])
    this.ctx.beginPath();
    this.ctx.moveTo(x0,y0);
    this.ctx.lineTo(x1,y1);
    this.ctx.stroke();
    
    this.ctx.setLineDash([])
    
    let sx0 = convertedSightPos.get([0,0])
    let sy0 = convertedSightPos.get([1,0])
    let sx1 = sx0 + l * Math.sin(sightAngle)
    let sy1 = sy0 - l * Math.cos(sightAngle)
    
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#00000077'
    this.ctx.setLineDash([7,3,4,3])
    this.ctx.beginPath();
    this.ctx.moveTo(sx0,sy0);
    this.ctx.lineTo(sx1,sy1);
    this.ctx.stroke()
    
    this.ctx.setLineDash([])
  }
  
  drawStdbarAngleLine(obj){
    const cx = obj.x
    const cy = obj.y
    
    const centerMatrix = math.matrix([[cx],[cy],[1]]);
    
    const objAngle = millToRad(obj.declination);
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      centerMatrix
    );
    
    let l = obj.intersection * this.system.camera.zoom * this.viewport.pixelPerGrid
    let x0 = convertedPos.get([0,0])
    let y0 = convertedPos.get([1,0])
    let x1 = x0 + l * Math.sin(objAngle)
    let y1 = y0 - l * Math.cos(objAngle)
    
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#55330077'
    this.ctx.setLineDash([2,2])
    this.ctx.beginPath();
    this.ctx.moveTo(x0,y0);
    this.ctx.lineTo(x1,y1);
    this.ctx.stroke();
    
    this.ctx.setLineDash([])
  }

  drawMortar(mortar){
    let mortarWidth = 0.1
    let mortarDiskRad = 0.3
    let mortarLength = 0.7
    
    const scale = this.objScale;
    const scaleMatrix = math.matrix([
      [scale, 0, 0],
      [0, scale, 0],
      [0, 0, 1]
    ])
    
    const sightPos = {x : -0.15, y : 0.3}
    
    const mortarDrawing = [
      {
        type: 'cir',
        x: 0,
        y: 0,
        radius: mortarDiskRad,
      },
      {
        type: 'cir',
        x: sightPos.x,
        y: sightPos.y,
        radius: 0.1,
      },
      {
        type: 'lineStart',
        x: mortarWidth,
        y: 0
      },
      {
        type : 'line',
        xf: mortarWidth,
        yf: mortarLength
      },
      {
        type : 'line',
        xf: -mortarWidth,
        yf: mortarLength
      },
      {
        type: 'line',
        xf: -mortarWidth,
        yf: 0
      },
      {
        type: 'fill'
      },
      {
        type: 'lineFinish'
      },
      {
        type: 'arc',
        x: 0,
        y: 0,
        radius: mortarWidth,
        beginAngle: 0,
        endAngle: Math.PI
      },
      
      {
        type: 'lineFinish'
      }
    ]
    
      const pos = math.matrix([
        [1,0,mortar.x],
        [0,1,mortar.y],
        [0,0,1]
      ]); //박격포 중심의 위치
      
      const negpos = math.matrix([
        [1,0,-mortar.x],
        [0,1,-mortar.y],
        [0,0,1]
      ]); //박격포 중심의 반대 평행이동
      
      const mortarAngle = -millToRad(mortar.declination);
      const angleMatrix = math.matrix([
        [Math.cos(mortarAngle), -Math.sin(mortarAngle), 0],
        [Math.sin(mortarAngle), Math.cos(mortarAngle), 0],
        [0,0,1]
      ])
      
      for(const drawing of mortarDrawing){
        
        switch (drawing.type){
          case 'cir': {
            const cx = drawing.x;
            const cy = drawing.y;
            const radius = drawing.radius * this.camera.zoom * this.viewport.pixelPerGrid * scale;
          
            const centerMatrix = math.matrix([[cx],[cy],[1]]);
          
            const convertedPos = math.multiply(
              this.buildWorldToCanvasMatrix(),
              this.buildCameraMatrix(),
              pos, 
              angleMatrix,
              scaleMatrix,
              centerMatrix
            );
          
            const x = convertedPos.get([0,0]);
            const y = convertedPos.get([1,0]);
          
            this.ctx.beginPath();       
            this.ctx.arc(x, y, radius, 0, 2*Math.PI)
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth   = this.lineWidth * scale;
            this.ctx.fillStyle = "white"
            this.ctx.fill();
            this.ctx.stroke();

            break;
          }
          
          case 'arc': {
            const cx = drawing.x;
            const cy = drawing.y;
            const radius = drawing.radius * this.camera.zoom * this.viewport.pixelPerGrid * scale;
          
            const centerMatrix = math.matrix([[cx],[cy],[1]]);
            
            const convertedPos = math.multiply(
              this.buildWorldToCanvasMatrix(),
              this.buildCameraMatrix(),
              pos, 
              angleMatrix,
              scaleMatrix,
              centerMatrix
            );
            
            const angle = millToRad(mortar.declination)
          
            const x = convertedPos.get([0,0]);
            const y = convertedPos.get([1,0]);
          
            this.ctx.beginPath();     
            this.ctx.arc(x, y, radius, drawing.beginAngle + angle, drawing.endAngle + angle);
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth   = this.lineWidth * scale;
            this.ctx.fillStyle = "white"
            this.ctx.fill();
            this.ctx.stroke();

            break;
          }
            
          case 'fill': {
            this.ctx.fillStyle = "white";
            this.ctx.fill();
            
            break;
          }
          
          case 'lineStart': {
            const xs = drawing.x, ys = drawing.y;
            const startMatrix = math.matrix([[xs],[ys],[1]]);
            const convertedStartPos = math.multiply(
              this.buildWorldToCanvasMatrix(),
              this.buildCameraMatrix(),
              pos, 
              angleMatrix,
              scaleMatrix,
              //negpos, 
              startMatrix
            );
            const xl = convertedStartPos.get([0,0]);
            const yl = convertedStartPos.get([1,0]);
          
            this.ctx.beginPath();         // ✅ 라인 전용 path 시작
            this.ctx.lineWidth = this.lineWidth * scale;
            this.ctx.strokeStyle = 'black';
            this.ctx.moveTo(xl, yl);
            break;
          }
          
          case 'line': {
            const xf = drawing.xf, yf = drawing.yf;
            const finishMatrix = math.matrix([[xf],[yf],[1]]);
            const convertedFinishPos = math.multiply(
              this.buildWorldToCanvasMatrix(),
              this.buildCameraMatrix(),
              pos,
              angleMatrix, 
              scaleMatrix,
              //negpos, 
              finishMatrix
            );
            const cxf = convertedFinishPos.get([0,0]);
            const cyf = convertedFinishPos.get([1,0]);
          
            this.ctx.lineTo(cxf, cyf);
            break;
          }
          
          case 'lineFinish': {
            this.ctx.stroke();            // ✅ 라인 마무리
            this.ctx.beginPath();         // ✅ path 초기화(끊기)
            break;
          }
        }
      }
      
      this.ctx.closePath();
  }
  
  drawFarbar(obj){
    const radius = 0.05;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]);
    const scale = this.objScale
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    
    const x = convertedPos.get([0,0]);
    const y = convertedPos.get([1,0]);
    
    this.ctx.fillStyle = "#aaff88"
    this.ctx.lineWidth   = this.lineWidth * scale;
    this.ctx.beginPath();
    this.ctx.arc(x,y,radius*this.camera.zoom*this.viewport.pixelPerGrid * scale,0,Math.PI*2)
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
  }
  
  drawNearbar(obj){
    const radius = 0.05;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]);
    
    const scale = this.objScale
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    
    const x = convertedPos.get([0,0]);
    const y = convertedPos.get([1,0]);
    
    this.ctx.fillStyle = "#ffaa88"
    this.ctx.lineWidth   = this.lineWidth * scale;
    this.ctx.beginPath();
    this.ctx.arc(x,y,radius*this.camera.zoom*this.viewport.pixelPerGrid * scale,0,Math.PI*2)
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
  }
  
  drawStdbar(obj){
    const radius = 0.1;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]);
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    const scale = this.objScale
    const x = convertedPos.get([0,0]);
    const y = convertedPos.get([1,0]);
    
    this.ctx.fillStyle = "#fff"
    this.ctx.lineWidth   = this.lineWidth * scale;
    this.ctx.beginPath();
    this.ctx.arc(x,y,radius*this.camera.zoom*this.viewport.pixelPerGrid * scale,0,Math.PI*2)
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
    
    const axisSize = 0.1 * this.camera.zoom * this.viewport.pixelPerGrid * scale;
    
    this.ctx.strokeStyle = "black";
    
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - axisSize, y);
    this.ctx.lineTo(x + axisSize, y);
    this.ctx.stroke();
    this.ctx.closePath();
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - axisSize);
    this.ctx.lineTo(x, y + axisSize);
    this.ctx.stroke();
    this.ctx.closePath();
  }
  
  drawTarget(obj){
    const radius = 15;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]);
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    
    const x = convertedPos.get([0,0]);
    const y = convertedPos.get([1,0]);
    
    this.ctx.fillStyle = "#fff"
    this.ctx.strokeStyle = "#000"
    this.ctx.lineWidth   = 5;
    this.ctx.beginPath();
    this.ctx.arc(x,y,radius,0,Math.PI*2)
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
    
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = "black"
    this.ctx.font = 'bold 27px noto-sans'

    this.ctx.fillText('T',x,y)
  }
  
  drawObserver(obj){
    const radius = 15;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]);
    
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    
    const x = convertedPos.get([0,0]);
    const y = convertedPos.get([1,0]);
    
    this.ctx.fillStyle = "#fff"
    this.ctx.strokeStyle = "#000"
    this.ctx.lineWidth   = 5;
    this.ctx.beginPath();
    this.ctx.arc(x,y,radius,0,Math.PI*2)
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
    
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = "black"
    this.ctx.font = 'bold 27px noto-sans'

    this.ctx.fillText('V',x,y)
  }
  
  drawSelectedObject(){
    const obj = this.system.selectedObject;
    if(!obj) return;
    
    const pos = math.matrix([
      [obj.x],
      [obj.y],
      [1]
    ]); //박격포 중심의 위치
    
    const radius = 0.7* this.camera.zoom *this.viewport.pixelPerGrid;
          
    const convertedPos = math.multiply(
      this.buildWorldToCanvasMatrix(),
      this.buildCameraMatrix(),
      pos
    );
    
    let x = convertedPos.get([0,0]);
    let y = convertedPos.get([1,0])
    
    //console.log(x,y)
    
    this.ctx.fillStyle = "#00ff0033";
    this.ctx.arc(x,y,radius,0,Math.PI*2);
    this.ctx.fill();
  }
}
class TouchManage{
  constructor(system, viewport){
    this.viewport = viewport;
    this.canvas = this.viewport.canvas;
    this.system = system;
    this.ctx = this.canvas.getContext('2d');
    
    this.exDist = 0;
    this.dist = 0;
    
    this.cx = 0;
    this.cy = 0;
    this.exCx = 0;
    this.exCy = 0;
    
    this.camera = this.system.camera;
    
    this.pointers = new Map();
    
    this.onPan = null
    this.onZoom = null
    
    this.canvas.addEventListener('pointerdown', e=>{
      this.pointers.set(e.pointerId, {
        x : e.clientX,
        y : e.clientY,
        exX : e.clientX,
        exY : e.clientY,
        isMoved : false
      });
      
      if(this.pointers.size == 2){
        let [p1, p2] = [...this.pointers.values()];
        
        let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
        
        this.dist = this.exDist = dist
        this.cx = this.exCx = (p1.x + p2.x)/2
        this.cy = this.exCy = (p1.y + p2.y)/2
      }
    });
    
    this.canvas.addEventListener('pointermove', e=>{
      const p = this.pointers.get(e.pointerId);
      if(p?.isMoved == true){
        p.exX = p.x;
        p.exY = p.y;
        
        p.x = e.clientX;
        p.y = e.clientY;
        //console.log('moving!')
      }
      else if(p?.isMoved == false){
        p.x = e.clientX;
        p.y = e.clientY;
        let d = Math.hypot(p.x-p.exX, p.y - p.exY)
        const threshold = 20
        if(d > threshold){
          p.isMoved = true;
          //console.log('moved!')
        }
        return;
      }
      
      //console.log(this.pointers.size)
      if(this.pointers.size == 1){
        let dx = p.x - p.exX;
        let dy = p.y - p.exY;
        
        //console.log(dx, dy);
        
        if(this.onPan) {
          this.onPan(-dx/(this.viewport.pixelPerGrid*this.camera.zoom),dy/(this.viewport.pixelPerGrid*this.camera.zoom))
        }
      }
      else if(this.pointers.size == 2){
        let [p1, p2] = [...this.pointers.values()];
        
        this.exCx = this.cx;
        this.exCy = this.cy;
        
        this.cx = (p1.x + p2.x)/2
        this.cy = (p1.y + p2.y)/2
        
        let dx = this.cx - this.exCx;
        let dy = this.cy - this.exCy;
        
        //console.log(dx, dy);
        
        if(this.onPan) {
          this.onPan(-dx/(this.viewport.pixelPerGrid*this.camera.zoom),dy/(this.viewport.pixelPerGrid*this.camera.zoom))
        }
      }
      
      this.touchpinch()
    })
    
    this.canvas.addEventListener('pointerup', e=>{
      const pointer = this.pointers.get(e.pointerId);
      //console.log(pointer)
      if(pointer.x == pointer.exX && pointer.y == pointer.exY && !pointer.isMoved){
        const p = math.matrix([
          [pointer.x],
          [pointer.y],
          [1]
        ])
        
        const T = math.inv(math.multiply(
          this.buildWorldToCanvasMatrix(),
          this.buildCameraMatrix()
        ))
        
        const convertedp = math.multiply(
          T,
          p
        )
        
        //console.log(convertedp)
        
        if(this.onTap) this.onTap(convertedp.get([0,0]),convertedp.get([1,0]));
      }
      this.pointers.delete(e.pointerId)
      this.cx = this.cy = this.exCx = this.exCy = 0
    })  
    this.canvas.addEventListener('pointercancel', e=>{
      this.pointers.delete(e.pointerId)
      this.cx = this.cy = this.exCx = this.exCy = 0
    })
  }
  
  buildWorldToCanvasMatrix(){
    const T = math.matrix([
      [1, 0, this.viewport.centerX],   // CSS px 기준
      [0, 1, this.viewport.centerY],
      [0, 0, 1]
    ]);

    const S = math.matrix([
      [ this.viewport.pixelPerGrid, 0, 0],
      [ 0,-this.viewport.pixelPerGrid, 0], // y 뒤집기 포함
      [ 0, 0, 1]
    ]);

    return math.multiply(T, S);
  }
  
  buildCameraMatrix(){
    const T = math.matrix([
      [1, 0, -this.camera.x],
      [0, 1, -this.camera.y],
      [0, 0, 1]
    ]);

    const S = math.matrix([
      [this.camera.zoom, 0, 0],
      [0, this.camera.zoom, 0],
      [0, 0, 1]
    ]);

    return math.multiply(S, T);
  }
  
  touchpinch(){
    if(this.pointers.size == 2){
      let [p1, p2] = [...this.pointers.values()];
      
      let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
        
      this.exDist = this.dist;
      this.dist = dist;
        
      const zoomfactor = this.dist / this.exDist
      if(this.onZoom) this.onZoom(zoomfactor)
    }
    else {
      this.exDist = this.dist = 0;
    }
  }
}

class System{
  constructor(){
    this.objects = [];
    this.selectedObject = null;
    
    this.camera = new Camera();
  }
}

class Camera{
  constructor(){
    this.x = 50000;
    this.y = 50000;
    this.rotation = 0; //radian; 쓸데는 없을듯
    this.zoom = .03;
    
    this.vecX = 0;
    this.vecY = 0;
    
    this._push = null;
  }
  
  move(dx, dy){
    this.x += dx;
    this.y += dy;
  }
  
  zoomin(factor){
    this.zoom *= factor
  }
  
  focusPushTo(tx, ty){
    const duration = 1
    
    this._push = {
      duration : duration,
      dx : tx - this.x,
      dy : ty - this.y,
      t : 0,
      sPrev : 0
    }
  }
  
  update(dt){
    if(!this._push) return;
    
    const ease = t => {return 1 - (1 - t)**10}
    
    const p = this._push;
    p.t = Math.min(p.t + dt, p.duration);
    const sNow = ease(p.t / p.duration)
    const incr = sNow - p.sPrev;
    
    this.move(p.dx*incr, p.dy*incr)
    
    p.sPrev = sNow;
    
    if(p.t >= p.duration) this._push=null;
  }
}

class Mortar{
  constructor(x,y){
    this.type = "mortar"
    this.name = "박격포"
    this.x = x;
    this.y = y;
    
    this.declination = 0; //편각, 단위 : mill
    this.sightangle = 3200; //가늠자 각도, 단위 : mill
    this.elevation = 800;
    
    this.intersection = 3590; // 사격거리
  }
}

class FarBar{
  constructor(x,y){
    this.type = "farbar"
    this.name = "원겨냥대"
    this.x = x;
    this.y = y;
  }
}

class NearBar{
  constructor(x,y){
    this.type = "nearbar"
    this.name = "근겨냥대"
    this.x = x;
    this.y = y;
  }
}

class StdBar{
  constructor(x,y){
    this.type = "stdbar"
    this.name = "기준겨냥대"
    this.x = x;
    this.y = y;
    
    this.declination = 0;
    this.intersection = 100;
  }
}

class Target{
  constructor(x,y){
    this.type = "target"
    this.name = "타겟"
    this.x = x;
    this.y = y;
  }
}

class Observer{
  constructor(x,y){
    this.type = "observer"
    this.name = "관측자"
    this.x = x;
    this.y = y;
  }
}


class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d')
    this.dpr = window.devicePixelRatio || 1;
    this.pixelPerGrid = 100;
    this.strLineWidth = 5;
    this.resize();
  }
  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width  = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width  = w + "px";
    this.canvas.style.height = h + "px";
    this.width  = w;
    this.height = h;
    this.centerX = w / 2;
    this.centerY = h / 2;
    
    // DrawManage constructor 끝쪽에
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}

class App{
  constructor(canvas){
    this.canvas = canvas;
    this.viewport = new Viewport(this.canvas)
    this.system = new System();
    this.drawManage = new DrawManage(this.system, this.viewport);
    this.touchManage = new TouchManage(this.system, this.viewport);
    this.panel = document.getElementById("panel");
    
    this.loop = this.loop.bind(this)
    this._tPrev = performance.now();
  
    this.posbtn = document.getElementById('sub_pos');
    this.posbtn.addEventListener('pointerup', (e) => {
      const posX = document.getElementById('inp_posX');
      const posY = document.getElementById('inp_posY');
      
      this.system.camera.focusPushTo(posX.value, posY.value);
      
      posX.innerText = posY.innerText = ""
    })
    
    this.objbar = document.getElementById("objbar")
    this.objbar.addEventListener("pointerup", (e) => {
      const btn = e.target.closest('.pill');
      if(!btn || !objbar.contains(btn)) return;
      
      const action = btn.dataset.action;
      
      const x = this.system.camera.x;
      const y = this.system.camera.y;
      
      const classobj = {
        mortar : Mortar,
        farbar : FarBar,
        nearbar : NearBar,
        stdbar : StdBar,
        target : Target,
        observer : Observer
      }
      
      let cls = new classobj[action](x,y)
      if(!cls) return;
      
      this.system.objects.push(cls)
      this.system.selectedObject = cls
      this.setOpenPanel();
      this.panel.classList.add("open");
    })
    
    this.touchManage.onPan = (dx, dy) => {
      this.system.camera.move(dx,dy)
    }
    
    this.touchManage.onZoom = (factor) => {
      this.system.camera.zoomin(factor)
    }
    
    this.touchManage.onTap = (wx, wy) => {
      const thresholdDist = 0.8/this.system.camera.zoom;
      let minDist = Infinity;
      let selobj = null;
      
      for(const obj of this.system.objects){
        let x0 = obj.x;
        let y0 = obj.y;
        
        let d = Math.hypot(wx - x0, wy - y0);
        
        if(d > thresholdDist) continue;
        if(d < minDist) {
          
          selobj = obj;
          minDist = d
        }
      }
      
      if(minDist == Infinity){
        this.system.selectedObject = null
        this.panel.classList.remove("open")
        
        let expanded = document.querySelector(".panel__expanded");
        if(expanded) expanded.innerHTML = "";
        return;
      }
      
      this.system.selectedObject = selobj
      this.system.camera.focusPushTo(selobj.x, selobj.y);
      console.log(this.system.selectedObject)
      this.setOpenPanel();
      this.panel.classList.add("open");
    };
  }
  loop(){
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._tPrev)/1000);
    this._tPrev = now;
    
    this.system.camera.update(dt);
    
    //console.log(dt)
    this.drawManage.clear();
    this.drawManage.drawGrid();
    this.drawManage.drawObjects();
    this.drawManage.drawAxis();
    this.drawManage.drawPos();
    this.drawManage.drawMill();
    requestAnimationFrame(this.loop);
  }
  
  setOpenPanel(){
    const obj = this.system.selectedObject;
    if(!obj) return;
    
    const panel = document.querySelector(".panel__expanded");
    //console.log(panel)
    const template = document.getElementById("tpl-" + obj.type);
    
    const clone = template.content.cloneNode(true);
    
    panel.innerHTML="";
    panel.appendChild(clone);
    
    const dlt = document.querySelector('.obj-delete')
    dlt.addEventListener("pointerup", (e)=> {
      //alert('1')
      const idx = this.system.objects.indexOf(this.system.selectedObject)
      
      this.system.objects.splice(idx,1);
      this.system.selectedObject = null;
      
      this.panel.classList.remove("open");
    })
    
    const objtype = document.querySelector('.obj-type');
    const objposition = document.querySelector('.obj-position')
    
    objtype.innerText = obj.name;
    objposition.innerText = Math.floor(obj.x) + " " + Math.floor(obj.y)
    
    this.__bindPanelFor();
  }
  
  __bindPanelFor(){
    const obj = this.system.selectedObject;
    
    if(obj.type == 'mortar'){
      this.bindNumberPair({
        inpId : 'decl-inp',
        rngId : 'decl-rng',
        getValue : () => obj.declination,
        setValue : (e) => {obj.declination = e}
      });
      this.bindNumberPair({
        inpId : 'sigh-inp',
        rngId : 'sigh-rng',
        getValue : () => obj.sightangle,
        setValue : (e) => {obj.sightangle = e}
      })
      this.bindNumberPair({
        inpId : 'elev-inp',
        rngId : 'elev-rng',
        getValue : () => obj.elevation,
        setValue : (e) => {obj.elevation = e}
      })
    }
    else if(obj.type == "stdbar"){
      this.bindNumberPair({
        inpId : 'decl-inp',
        rngId : 'decl-rng',
        getValue : () => obj.declination,
        setValue : (e) => {obj.declination = e}
      })
    }
  }
  
  bindNumberPair({inpId, rngId, getValue, setValue}){
    const inp = document.getElementById(inpId);
    const rng = document.getElementById(rngId);
    
    const init = Number(getValue());
    console.log(init)
    inp.value = init;
    rng.value = init;
    
    const apply = (type,rawValue) =>{
      const min = Number(rng.min);
      const max = Number(rng.max);
      const step = Number(rng.step || 1)
      
      let v = math.evaluate(rawValue)
      
      v = Math.round(v/step)*step
      
      if(type == 'inp') v = (v-min)%max + min
      
      inp.value = rng.value = v
      
      setValue(v);
    }
    
    rng.addEventListener('input', ()=>apply('rng', rng.value));
    inp.addEventListener('change', ()=>apply('inp', inp.value));
  }
}

window.addEventListener('load', () => {
  if (!window.math) {
    console.error('math.js가 로드되지 않았습니다.');
    return;
  }
  let app = new App(canvas);
  app.loop();
});