const Fruit = cc.Class({
    name: 'FruitItem',
    properties: {
        id: 0,
        iconSF: cc.SpriteFrame
    }
});

const JuiceItem = cc.Class({
    name: 'JuiceItem',
    properties: {
        particle: cc.SpriteFrame,
        circle: cc.SpriteFrame,
        slash: cc.SpriteFrame,
    }
});

cc.Class({
    extends: cc.Component,

    properties: {
        fruits: {
            default: [],
            type: Fruit
        },

        juices: {
            default: [],
            type: JuiceItem
        },

        // 动态生成 找到批量处理预置元素的方案
        fruitPrefab: {
            default: null,
            type: cc.Prefab
        },

        juicePrefab: {
            default: null,
            type: cc.Prefab
        },

        // todo 可以实现一个audioManager
        boomAudio: {
            default: null,
            type: cc.AudioClip
        },
        knockAudio: {
            default: null,
            type: cc.AudioClip
        },
        waterAudio: {
            default: null,
            type: cc.AudioClip
        },
        scoreLabel: {
            default: null,
            type: cc.Label
        },
        pauseBtn: {
            default: null,
            type: cc.Button
        },
        resetBtn: {
            default: null,
            type: cc.Button
        },
        tryBtn:{
            default: null,
            type: cc.Button
        },
        timerTxt: {
            default: null,
            type: cc.Label
        }
    },

    onLoad() {
        this.initPhysics()

        this.initGame()     

        // 监听点击事件 todo 是否能够注册全局事件
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this)       

    },
    start() {},

    initGame(){
        this.isCreating = false
        this.fruitCount = 0
        this.score = 0
        this.useFinger = false
        this.bStop = false
        this.tryBtn.node.active = false
        this.resetBtn.enabled = true
        this.pauseBtn.enabled = true
        this.initOneFruit()

        this.counters = 30 * 60
        this.schedule( this.counterHandler, 1);
    },

    counterHandler() {                // 倒计时算法
        if (this.counters >= 1) {
            this.counters = this.counters - 1;
            //场景中文本框显示
            let min = Math.ceil(this.counters / 60) - 1;
            let sec = this.counters % 60;
            if( min < 0 ) min = 0
            if( min < 10 )  min = '0' + min
            if( sec < 10 ) sec = '0' + sec
            this.timerTxt.string = `${min}:${sec}`
        }else {
            this.timerTxt.string = '00:00'
            this.resetBtn.enabled = false
            this.pauseBtn.enabled = false
            this.tryBtn.enabled = true;
            this.tryBtn.node.active = true;
            cc.director.pause();
            this.unschedule(this.counterHandler)
        }
    },

    // 开启物理引擎和碰撞检测
    initPhysics() {
        // 物理引擎
        const instance = cc.director.getPhysicsManager()
        instance.enabled = true
        // instance.debugDrawFlags = 4
        instance.gravity = cc.v2(0, -960);

        // 碰撞检测
        const collisionManager = cc.director.getCollisionManager();
        collisionManager.enabled = true

        // 设置四周的碰撞区域
        let width = this.node.width;
        let height = this.node.height;

        let node = new cc.Node();

        let body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Static;

        const _addBound = (node, x, y, width, height) => {
            let collider = node.addComponent(cc.PhysicsBoxCollider);
            collider.offset.x = x;
            collider.offset.y = y;
            collider.size.width = width;
            collider.size.height = height;
        }

        _addBound(node, 0, -height / 2, width, 1);
        _addBound(node, 0, height / 2, width, 1);
        _addBound(node, -width / 2, 0, 1, height);
        _addBound(node, width / 2, 0, 1, height);

        node.parent = this.node;
    },

    initOneFruit(id = 1) {
        this.fruitCount++
        this.currentFruit = this.createFruitOnPos(0, 400, id)
    },

    // 监听屏幕点击
    onTouchStart(e) {
        if (this.isCreating) return
        this.isCreating = true
        const {width, height} = this.node


        const fruit = this.currentFruit

        const pos = e.getLocation()
        let {x, y} = pos
        x = x - width / 2
        y = y - height / 2

        const action = cc.sequence(cc.moveBy(0.3, cc.v2(x, 0)).easing(cc.easeCubicActionIn()), cc.callFunc(() => {
            // 开启物理效果
            this.startFruitPhysics(fruit)

            // 1s后重新生成一个
            this.scheduleOnce(() => {
                const nextId = this.getNextFruitId()
                this.initOneFruit(nextId)
                this.isCreating = false
            }, 1)
        }))

        fruit.runAction(action)
    },
    //  重置游戏
    onResetGame(){
        if(this.bStop) return
        this.pauseBtn.node.children[0].children[0]._renderComponent.string = 'Pause'
        cc.director.resume();
        this.scoreLabel.string = this.score = 0
        this.resetBtn.enabled = true
        this.currentFruit = null
        let rmNodes = this.node.children.filter(e=>(e._name.indexOf('fruit')>-1) || (e._name.indexOf('juice')>-1))
        rmNodes.forEach(e=>e.removeFromParent(true))
        this.initGame()
    },
    //  暂停/恢复游戏
    onPauseTouch() {
        this.bStop = !this.bStop;
        if (this.bStop) {
            this.pauseBtn.node.children[0].children[0]._renderComponent.string = 'Continue'
            cc.director.pause();
            this.resetBtn.enabled = false
        }
        else {
            this.pauseBtn.node.children[0].children[0]._renderComponent.string = 'Pause'
            this.resetBtn.enabled = true
            cc.director.resume();
        }
    },
    // 获取下一个水果的id
    getNextFruitId() {
        if (this.fruitCount < 3) {
            return 1
        } else if (this.fruitCount === 3) {
            return 2
        } else {
            // 随机返回前5个
            return Math.floor(Math.random() * 5) + 1
        }
    },
    // 创建一个水果
    createOneFruit(num) {
        let fruit = cc.instantiate(this.fruitPrefab);
        const config = this.fruits[num - 1]

        fruit.getComponent('Fruit').init({
            id: config.id,
            iconSF: config.iconSF
        });

        fruit.getComponent(cc.RigidBody).type = cc.RigidBodyType.Static
        fruit.getComponent(cc.PhysicsCircleCollider).radius = 0

        this.node.addChild(fruit);
        fruit.scale = 0.6

        // 有Fruit组件传入
        fruit.on('sameContact', this.onSameFruitContact.bind(this))
        fruit.on(cc.Node.EventType.TOUCH_START, (e) => {
            // 选择道具时直接消除对应水果
            if (this.useFinger && fruit !== this.currentFruit) {
                const {x, y, width} = fruit
                this.createFruitJuice(config.id, cc.v2({x, y}), width)
                e.stopPropagation()
                this.useFinger = false
                fruit.removeFromParent(true)

            }
        })

        return fruit
    },

    startFruitPhysics(fruit) {
        fruit.getComponent(cc.RigidBody).type = cc.RigidBodyType.Dynamic
        const physicsCircleCollider = fruit.getComponent(cc.PhysicsCircleCollider)
        physicsCircleCollider.radius = fruit.height / 2
        physicsCircleCollider.apply()
    },

    // 在指定位置生成水果
    createFruitOnPos(x, y, type = 1) {
        const fruit = this.createOneFruit(type)
        fruit.setPosition(cc.v2(x, y));
        return fruit
    },
    // 两个水果碰撞
    onSameFruitContact({self, other}) {
        other.node.off('sameContact') // 两个node都会触发，todo 看看有没有其他方法只展示一次的

        const id = other.getComponent('Fruit').id
        // todo 可以使用对象池回收
        self.node.removeFromParent(true)
        other.node.removeFromParent(true)

        const {x, y} = other.node

        this.createFruitJuice(id, cc.v2({x, y}), other.node.width)

        this.addScore(id)

        const nextId = id + 1
        if (nextId <= 11) {
            const newFruit = this.createFruitOnPos(x, y, nextId)

            this.startFruitPhysics(newFruit)

            // 展示动画 todo 动画效果需要调整
            newFruit.scale = 0
            cc.tween(newFruit).to(.5, {
                scale: 0.6
            }, {
                easing: "backOut"
            }).start()

            if(nextId===11){
                top.window.postMessage({
                    status:'success',source:'cocos',project:'bwm',nextId
                },'*')
                // cc.director.end()
            }
        } else {
            // todo 合成两个西瓜
            console.log(' todo 合成两个西瓜 还没有实现哦~ ')
        }
    },

    // 合并时的动画效果
    createFruitJuice(id, pos, n) {
        // 播放合并的声音
        cc.audioEngine.play(this.boomAudio, false, 1);
        cc.audioEngine.play(this.waterAudio, false, 1);

        // 展示动画
        let juice = cc.instantiate(this.juicePrefab);
        this.node.addChild(juice);

        const config = this.juices[id - 1]
        const instance = juice.getComponent('Juice')
        instance.init(config)
        instance.showJuice(pos, n)
    },
    // 添加得分分数
    addScore(fruitId) {
        this.score += fruitId * 2
        // todo 处理分数tween动画
        this.scoreLabel.string = this.score
    }
});
