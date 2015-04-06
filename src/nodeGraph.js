/*
 *
 * nodeGraph.js
 * Advenced node graphics using svg and canvas.
 * Version: 0.1.0
 *
 * Konstantin Darutkin
 * 05 March 2015
 *
 * Inspired by Braden Kowitz from Google Ventures.
 *
 */

var nodeGraph = {};

nodeGraph.Style = function() {
	var self = this;

	this.options = {
		nodeRadius: 5,
		nodeHoverRadius: 10,
		nodeHoverDistance: 50,
		nodeHoverPhysicsDistance: 100,
		nodeHoverAnimationTime: 0.2,
		nodeStrokeColor: "rgba(131, 202, 233, 0.8)",
		nodeHoveredStrokeColor: "rgba(131, 202, 233, 1)",
		nodeStrokeWidth: 1,
		nodeFillColor: "#ffffff",
		edgeColor: "rgba(131, 202, 233, 0.5)",
		edgeWidth: 1
	};
	this.property = function(name, value) { 
		if(typeof(value) == "undefined")
			return this.options[name];
		else
			this.options[name] = value; 
	};
	this.get = function() { 
		return this.options; 
	};
	this.set = function(options) {
		for(var key in options) 
			this.options[key] = options[key];
	};
}

nodeGraph.Graph = function(elementID) {
	var self = this;

	this.renderer = null;
	this.width = 0;
	this.height = 0;
	this.nodes = [];
	this.edges = [];
	this.style = new nodeGraph.Style();

	this.animationsList = [];

	this.setRender = function( renderer ){
		this.renderer = renderer;
		this.edgeRenderer = renderer.draw.group();
		this.nodeRenderer = renderer.draw.group();
	}

	this.addAnimation = function( name ){
		this.animationsList.push(name);
		this.startAnimation();
	}

	this.startAnimation = function(){
		if(!this.animation) {
			this.domElement = this.renderer.draw.parent;
			this.cursor = new nodeGraph.Cursor(this);
			this.timer = new nodeGraph.Timer(this);
			this.animation = new nodeGraph.Animation(this);
		}
	}

	this.enableStretchPhysics = function() {
		this.stretchPhysics = new nodeGraph.stretchPhysics();
		this.startAnimation();
	}	

	this.size = function(w, h){
		this.width = w;
		this.height = h;
		this.renderer.size(w, h);
	}

	this.addEdge = function(index1, index2) {
		var edge = new nodeGraph.Edge(this.nodes[index1], this.nodes[index2], this.edgeRenderer, this.style);
		this.edges.push(edge);
	}

	this.fromJSON = function(json) {
		this.size( json.width, json.height );

		for(var i in json.nodes)
			this.nodes[i] = new nodeGraph.Node(json.nodes[i].x, json.nodes[i].y, this.nodeRenderer, this.style);

		for(var i in json.edges)
			this.addEdge(json.edges[i].n1, json.edges[i].n2);
	}

	this.redraw = function(json) {
		for(var i in this.edges)
			this.edges[i].redraw();
		for(var i in this.nodes)
			this.nodes[i].redraw();

	}

	this.callbacks = {
		graphMouseEnter: function() { self.timer.start(); },
		graphMouseLeave: function() { self.timer.stop(); }
	};

	this.callback = function(name, parameter) {
		if(this.callbacks[name])
			this.callbacks[name](parameter);
	}

	this.redraw = function() {
		for(var i in this.nodes) 
			this.nodes[i].redraw();
		for(var i in this.edges) 
			this.edges[i].redraw();
	}

	this.render = function() {
		this.redraw();
	}
}

nodeGraph.Vector = function(x, y) {
	this.x = x;
	this.y = y;

	this.scale 	= function(scaleFactor) { this.x *= scaleFactor; this.y *= scaleFactor; }
	this.plus 	= function(vector) { return new nodeGraph.Vector( this.x + vector.x, this.y + vector.y ); }
	this.minus 	= function(vector) { return new nodeGraph.Vector( this.x - vector.x, this.y - vector.y ); }
	this.add 	= function(vector) { this.x += vector.x; this.y += vector.y; }

	this.distanceTo = function(vector) { 
		var dx = this.x - vector.x;
		var dy = this.y - vector.y;

		return Math.sqrt(dx*dx + dy*dy);
	}

	this.length = function() {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	}
};

nodeGraph.Node = function(x, y, draw, style) {
	this.position = new nodeGraph.Vector(x, y);
	this.original = new nodeGraph.Vector(x, y);
	this.radius = style.options.nodeRadius;
	this.style = style;

	this.isAttachedToCursor = false;
	this.isHovered = false;

	var set = draw.set();
	var nodeElement = draw.circle(style.options.nodeRadius);
		nodeElement.attr({
			fill: style.options.nodeFillColor,
			"stroke": style.options.nodeStrokeColor,
			"stroke-width": style.options.nodeStrokeWidth
		}); 

	set.add(nodeElement);
	set.center(this.position.x, this.position.y);

	this.attachToCursor = function() {
		this.isAttachedToCursor = true;
	}
	this.detachFromCursor = function() {
		this.isAttachedToCursor = false;
	}

	this.redraw = function() {
		set.center(this.position.x, this.position.y);
	
		nodeElement.radius(this.radius);
		nodeElement.attr({ 
			fill: this.style.options.nodeFillColor,
			"stroke": (this.isHovered ? this.style.options.nodeHoveredStrokeColor : this.style.options.nodeStrokeColor),
			"stroke-width": this.style.options.nodeStrokeWidth
		});
	}
}

nodeGraph.Edge = function(node1, node2, draw, style) {
	this.node1 = node1;
	this.node2 = node2;
	this.originalLength = this.node1.original.distanceTo(this.node2.original);

	var edgeElement = draw.line(this.node1.position.x, this.node1.position.y, this.node2.position.x, this.node2.position.y);
		edgeElement.stroke({ width: style.options.edgeWidth, color: style.options.edgeColor });

	this.redraw = function() {
		edgeElement.attr({
			x1: this.node1.position.x,
			y1: this.node1.position.y,
			x2: this.node2.position.x,
			y2: this.node2.position.y
		});
	}

	this.length = function() {
    	return this.node1.position.distanceTo(this.node2.position);
  	};
}

nodeGraph.Cursor = function(graph){
	var self = this;

	this.element = graph.domElement;
	this.graph = graph;
	this.position = new nodeGraph.Vector(0, 0);

	this.hoverDistance = 100;
	this.mouseDown = false;
	this.mousePresent = false;

	this.element.addEventListener("mousemove", function(event) {
	    if (event.offsetX !== undefined) {
	      	self.position.x = event.offsetX;
	      	self.position.y = event.offsetY;
	    }
	});

	this.element.addEventListener("mouseenter", function(event) {
		self.graph.callback("graphMouseEnter");
		self.mousePresent = true;
	}); 
	this.element.addEventListener("mouseleave", function(event) {
		self.graph.callback("graphMouseLeave");
		self.mousePresent = false;
		self.mouseDown = false;
	}); 
	this.element.addEventListener("mousedown", function(event) {
		self.mouseDown = true;
	});
	this.element.addEventListener("mouseup", function(event) {
		self.mouseDown = false;
	});
}

nodeGraph.Timer = function(graph) {
	var self = this;

	this.graph = graph;
	this.autoStart = true;	
	this.fps = 30;
	this.stepTime = 1000 / this.fps;
	
	var timerType = "interval";
	var isRunning = false;
	var timerID = null;
	var stopTimerID = null;
	if( requestAnimationFrame ) this.timerType = "animationFrame";

	var tick = function() {
		if(isRunning) {
			if(self.graph.animation)
				self.graph.animation.tween();

			if(timerType == "interval")
				timerID = setTimeout(tick, self.stepTime); 
			else 
				requestAnimationFrame(tick);
		}	
	}

	this.start = function() {
		if(isRunning) return null;

		isRunning = true;
		if(timerType == "interval") {
			if(timerID) 
				clearTimeout(timerID); 
		    if (stopTimerID)
		    	clearTimeout(stopTimer);
		    timerID = setTimeout(tick, this.stepTime);
		} else {
			requestAnimationFrame(tick);
		}
	}

	this.stop = function() {
		//isRunning = false;
		//clearTimeout(timerID);
	}

	if(this.autoStart)
		this.start();
}

nodeGraph.Animation = function(graph) {
	this.graph = graph;

	this.defaultAnimations = {
		hoverAnimation: function(node, cursor, distance, graph) {
			if(distance < node.style.options.nodeHoverDistance){ 
				if(node.radius < node.style.options.nodeHoverRadius) {
					node.radius += (node.style.options.nodeHoverRadius - node.style.options.nodeRadius) / (graph.timer.fps * node.style.options.nodeHoverAnimationTime);
					node.isHovered = true;

					graph.callback("nodeMouseOver", node);
				}
			} else { 
				if(node.radius > node.style.options.nodeRadius) {
					node.radius -= (node.style.options.nodeHoverRadius - node.style.options.nodeRadius) / (graph.timer.fps * node.style.options.nodeHoverAnimationTime);
					node.isHovered = false; 

					graph.callback("nodeMouseOut", node);
				}
			}
		}
	};

	this.tween = function() {
		for(var i in graph.nodes) {
			var cursor = graph.cursor;
			var node = graph.nodes[i];
			var distance = node.position.distanceTo(cursor.position);

			for(var i in this.graph.animationsList) {
				var animationName = this.graph.animationsList[i];
				if(this.defaultAnimations[animationName])
					this.defaultAnimations[animationName](node, cursor, distance, graph);
			}

			if(graph.stretchPhysics) {
				graph.stretchPhysics.applyCursorForce(node, cursor, distance);
				graph.stretchPhysics.applyOriginalForce(node);
			}
		}
		
		for(var i in graph.edges) {
			var edge = graph.edges[i];
	        
			if(graph.stretchPhysics) {
				graph.stretchPhysics.applyEdgeStretchForce(edge);
			}
		}

		this.graph.redraw();
	}
}

nodeGraph.stretchPhysics = function() {
	var self = this;

	this.hoverForce = 0.02;
	this.originalPositionForce = 0.1;
	this.edgeStretchForce = 0.2;
 	this.dragForce = 0.4;

	this.applyCursorForce = function(node, cursor, distance) {
		if(cursor.mousePresent){
		    var differnce = cursor.position.minus(node.position);

			if(cursor.mouseDown) {
				if(node.isAttachedToCursor) {
					differnce.scale(this.dragForce);
          			node.position.add(differnce);
				} else if(distance < node.style.options.nodeHoverPhysicsDistance) {
		          	differnce.scale(self.hoverForce);
		          	node.position.add(differnce);
		        }
			} else {
				if(distance < node.style.options.nodeHoverDistance) {
					node.attachToCursor();
				} else {
					node.detachFromCursor();
				}

		        if(distance < node.style.options.nodeHoverPhysicsDistance) {
		          	differnce.scale(self.hoverForce);
		          	node.position.add(differnce);
		        }
			}
		}
	}

	this.applyOriginalForce = function(node) {
		var differnce = node.original.minus(node.position);
    	differnce.scale(this.originalPositionForce);
   		node.position.add(differnce);	
	}

	this.applyEdgeStretchForce = function(edge) {
		var force = edge.node1.position.minus(edge.node2.position);
	    var length = edge.length();
	    var stretch = length - edge.originalLength;
	 
	    force.scale( this.edgeStretchForce * stretch / length);
	    edge.node2.position.add(force);
	    force.scale(-1);
	    edge.node1.position.add(force);
	}
}

nodeGraph.SVGRenderer = function( elementOrId, width, height ) {
	this.draw = new SVG(elementOrId);

	this.size = function(w, h) {
		this.draw.width = w;
		this.draw.height = h;
		this.draw.parent.style.width = parseFloat(w) + 'px';
		this.draw.parent.style.height = parseFloat(h) + 'px';
	}
}