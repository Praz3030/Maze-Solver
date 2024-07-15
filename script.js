function PriorityQueue(comparator) {
  this._comparator = comparator;
  this._heap = [];
}

PriorityQueue.prototype._parent = function (idx) {
  return Math.floor((idx - 1) / 2);
};

PriorityQueue.prototype._leftChild = function (idx) {
  return idx * 2 + 1;
};

PriorityQueue.prototype._rightChild = function (idx) {
  return idx * 2 + 2;
};

PriorityQueue.prototype._swap = function (i, j) {
  var temp = this._heap[i];
  this._heap[i] = this._heap[j];
  this._heap[j] = temp;
};

PriorityQueue.prototype.queue = function (value) {
  this._heap.push(value);

  var idx = this._heap.length - 1;

  while (
    idx !== 0 &&
    this._comparator(this._heap[this._parent(idx)], this._heap[idx]) > 0
  ) {
    this._swap(idx, this._parent(idx));
    idx = this._parent(idx);
  }
};

PriorityQueue.prototype.dequeue = function () {
  var root = this._heap[0];

  var end = this._heap.pop();

  if (this._heap.length > 0) {
    this._heap[0] = end;

    var idx = 0;
    var length = this._heap.length;

    while (true) {
      var left = this._leftChild(idx);
      var right = this._rightChild(idx);

      var swapIdx = null;

      if (left < length && this._comparator(this._heap[left], end) < 0) {
        swapIdx = left;
      }

      if (
        right < length &&
        (swapIdx === null ||
          this._comparator(this._heap[right], this._heap[left]) < 0)
      ) {
        swapIdx = right;
      }

      if (swapIdx === null) break;

      this._swap(idx, swapIdx);
      idx = swapIdx;
    }
  }

  return root;
};

PriorityQueue.prototype.length = function () {
  return this._heap.length;
};

function whileAsync(cond, body, chunkSize, period) {
  var chunkSize = chunkSize || 10;
  var period = period || 0;
  return new Promise(function (resolve, reject) {
    var interval = setInterval(function () {
      for (var k = 0; k < chunkSize; k++) {
        if (!cond()) {
          clearInterval(interval);
          resolve();
          return;
        }
        body();
      }
    }, period);
  });
}

function addEphemeralClass(element, className, duration) {
  var duration = duration || 1000;
  element.classList.add(className);
  setTimeout(function () {
    element.classList.remove(className);
  }, duration);
}

function Point(x, y) {
  this.x = parseInt(x);
  this.y = parseInt(y);
}

Point.prototype.equals = function (other) {
  return other.x == this.x && other.y == this.y;
};

Point.prototype.serialize = function () {
  return JSON.stringify([this.x, this.y]);
};

Point.prototype.insideBounds = function (bounds) {
  return this.x >= 0 && this.x < bounds.x && this.y >= 0 && this.y < bounds.y;
};

Point.prototype.offset = function (delta) {
  return new Point(this.x + parseInt(delta[0]), this.y + parseInt(delta[1]));
};

function heuristic(a, b) {
  var d1 = Math.abs(b.x - a.x);
  var d2 = Math.abs(b.y - a.y);
  return d1 + d2;
}

function Maze(options) {
  var options = Object.assign(
    {
      gridElement: document.getElementById("body"),
      gridSize: new Point(20, 10),
      startPosition: new Point(0, 0),
      targetPosition: null,
      blockSize: 25,
      onSolved: function () {},
    },
    options || {}
  );

  this.gridElement = options.gridElement;
  this.blockSize = options.blockSize;
  this.onSolved = options.onSolved;
  this.bounds = options.gridSize;
  this.startPosition = options.startPosition;
  this.targetPosition = options.targetPosition || this.bounds.offset([-1, -1]);

  this.sides = ["bottom", "right", "top", "left"];
  this.oppositeSides = ["top", "left", "bottom", "right"];
  this.delta = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  this.keyCodeDirMap = { 37: "left", 38: "top", 39: "right", 40: "bottom" };

  this.blocks = new Array(this.bounds.y);
  for (var i = 0; i < this.bounds.y; i++) {
    this.blocks[i] = new Array(this.bounds.x);
  }

  var self = this;
  document.onkeydown = function (e) {
    if (self.solving || self.solved) {
      return;
    }
    if (e.keyCode in self.keyCodeDirMap) {
      self.movePlayer(self.keyCodeDirMap[e.keyCode]);
      e.preventDefault();
    }
  };
}

Maze.prototype.createBlock = function (p) {
  var block = document.createElement("div");
  block.classList.add("block");
  block.style.left = p.x * this.blockSize + "px";
  block.style.top = p.y * this.blockSize + "px";
  block.open = { left: false, top: false, bottom: false, right: false };
  return block;
};

Maze.prototype.getBlock = function (point) {
  return this.blocks[point.y][point.x];
};

Maze.prototype.getPlayerBlock = function () {
  return this.getBlock(this.position);
};

Maze.prototype.reset = function () {
  if (this.solving || this.reseting) {
    return false;
  }

  this.reseting = true;
  this.position = this.startPosition;
  this.solving = false;
  this.solved = false;

  while (this.gridElement.firstChild) {
    this.gridElement.removeChild(this.gridElement.firstChild);
  }

  var fragment = document.createDocumentFragment();
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.createBlock(new Point(x, y), 25);
      this.blocks[y][x] = block;
      fragment.appendChild(block);
    }
  }
  this.gridElement.appendChild(fragment);

  this.getBlock(this.targetPosition).classList.add("target");

  var self = this;
  return this.generate().then(function () {
    self.setPlayerPosition(self.startPosition);
    self.reseting = false;
  });
};

Maze.prototype.getAdjacents = function (point, visitedSet) {
  var adjacents = [];
  for (var i = 0; i < this.delta.length; i++) {
    var cp = point.offset(this.delta[i]);
    cp.side = this.sides[i];
    cp.oppositeSide = this.oppositeSides[i];
    if (cp.insideBounds(this.bounds) && !visitedSet.has(cp.serialize())) {
      adjacents.push(cp);
    }
  }
  return adjacents;
};

Maze.prototype.movePlayer = function (direction) {
  var currentBlock = this.getPlayerBlock();
  var delta = this.delta[this.sides.indexOf(direction)];
  var nextPosition = this.position.offset(delta);

  if (!nextPosition.insideBounds(this.bounds)) {
    addEphemeralClass(currentBlock, "error", 100);
    return;
  }

  if (!currentBlock.open[direction]) {
    addEphemeralClass(currentBlock, "error", 100);
    return;
  }

  this.setPlayerPosition(nextPosition);
};

Maze.prototype.setPlayerPosition = function (position) {
  this.getPlayerBlock().classList.remove("current");
  this.position = position;
  this.getPlayerBlock().classList.add("current");
  if (!this.solved && this.position.equals(this.targetPosition)) {
    this.solved = true;
    if (!this.solving) {
      this.onSolved();
    }
  }
};

Maze.prototype.generate = function () {
  var blockCount = this.bounds.x * this.bounds.y;
  var stack = [];
  var visited = new Set();
  var start = this.startPosition;
  stack.push(start);

  var i = 0;
  return whileAsync(
    () => visited.size < blockCount,
    () => {
      var point = stack[stack.length - 1];
      var ps = point.serialize();

      var block = this.getBlock(point);

      if (!visited.has(ps)) {
        visited.add(ps);
        block.dataset.index = i;
        block.classList.add("generated");
        i++;
      }

      var adjacents = this.getAdjacents(point, visited);

      if (adjacents.length == 0) {
        stack.pop();
        return;
      }

      var rand = parseInt(Math.random() * 1000);
      var np = adjacents[rand % adjacents.length];
      var ajdBlock = this.getBlock(np);
      stack.push(np);

      block.classList.add(np.side);
      block.open[np.side] = true;

      ajdBlock.classList.add(np.oppositeSide);
      ajdBlock.open[np.oppositeSide] = true;
    },
    100
  );
};

Maze.prototype.solveBFS = function () {
  if (this.solving || this.reseting) {
    return;
  }

  function updateDescription(newContent) {
    var descriptionElement = document.getElementById("description");
    descriptionElement.innerHTML = newContent;
  }

  updateDescription(`
        <h1 style="text-align:center;
        color: white;
        font-size: 3rem;">BSF Algorithm</h1>
        <p style="font-size:1.3rem">
          The breadth-first search or BFS algorithm is used to search a tree or graph data structure for a node that meets a set of criteria. It begins at the root of the tree or graph and investigates all nodes at the current depth level before moving on to nodes at the next depth level. You can solve many problems in graph theory via the breadth-first search. For example, finding the shortest path between two vertices a and b is determined by the number of edges. In a flow network, the Ford–Fulkerson method is used to calculate the maximum flow and when a binary tree is serialized/deserialized instead of serialized in sorted order, the tree can be reconstructed quickly.
        </p>
      `);

  function updatetime(newContent) {
    var descriptionElement = document.getElementById("time-complexity");
    descriptionElement.innerHTML = newContent;
  }

  updatetime(`
        <h1 style="text-align:center;
        color: white;
        font-size: 3rem;">Time Complexity</h1>
        <p style="font-size:1.3rem">
          The time complexity of BFS is O(V + E), where V is the number of vertices and E is the number of edges in the graph. The BFS algorithm starts at a root node and visits all the adjacent nodes.
        </p>
      `);

  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var queue = [position];
  var self = this;

  return whileAsync(
    () => {
      return queue.length > 0 && !position.equals(self.targetPosition);
    },
    () => {
      position = queue.shift();
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        nextPosition.previous = position;
        queue.push(nextPosition);
      }
    }
  )
    .then(function () {
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      self.solving = false;
    });
};

Maze.prototype.solveDFS = function () {
  if (this.solving || this.reseting) {
    return;
  }

  function updateDescription(newContent) {
    var descriptionElement = document.getElementById("description");
    descriptionElement.innerHTML = newContent;
  }

  updateDescription(`
        <h1 style="text-align:center;
        color: white;
        font-size: 3rem;">DFS Algorithm</h1>
        <p style="font-size:1.3rem">
          Depth-First Search or DFS algorithm is a recursive algorithm that uses the backtracking principle. It entails conducting exhaustive searches of all nodes by moving forward if possible and backtracking, if necessary. To visit the next node, pop the top node from the stack and push all of its nearby nodes into a stack. Topological sorting, scheduling problems, graph cycle detection, and solving puzzles with just one solution, such as a maze or a sudoku puzzle, all employ depth-first search algorithms. Other applications include network analysis, such as determining if a graph is bipartite.
        </p>
      `);

  function updatetime(newContent) {
    var descriptionElement = document.getElementById("time-complexity");
    descriptionElement.innerHTML = newContent;
  }

  updatetime(`
        <h1 style="text-align:center;
        color: white;
        font-size: 3rem;">Time Complexity</h1>
        <p style="font-size:1.3rem">
          The time complexity of the DFS algorithm is O(V+E), where V is the number of vertices and E is the number of edges in the graph.
        </p>
      `);

  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var stack = [position];
  var self = this;

  return whileAsync(
    () => {
      return stack.length > 0 && !position.equals(self.targetPosition);
    },
    () => {
      position = stack.pop();
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        nextPosition.previous = position;

        stack.push(nextPosition);
      }
    }
  )
    .then(function () {
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      self.solving = false;
    });
};

Maze.prototype.clearMaze = function () {
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.getBlock(new Point(x, y));
      block.classList.remove("visited", "path");
    }
  }
};

Maze.prototype.clearMazeAndReset = function () {
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.getBlock(new Point(x, y));
      block.classList.remove("visited", "path");
    }
  }
  this.setPlayerPosition(this.startPosition);
};

Maze.prototype.generateMultipleSolutions = function () {
  var blockCount = this.bounds.x * this.bounds.y;
  var stack = [];
  var visited = new Set();
  var start = this.startPosition;
  stack.push(start);

  var i = 0;
  return whileAsync(
    () => visited.size < blockCount,
    () => {
      var point = stack[stack.length - 1];
      var ps = point.serialize();

      var block = this.getBlock(point);

      if (!visited.has(ps)) {
        visited.add(ps);
        block.dataset.index = i;
        block.classList.add("generated");
        i++;
      }

      var adjacents = this.getAdjacents(point, visited);

      if (adjacents.length == 0) {
        stack.pop();
        return;
      }

      shuffleArray(adjacents);

      var np = adjacents.pop();
      var ajdBlock = this.getBlock(np);
      stack.push(np);

      block.classList.add(np.side);
      block.open[np.side] = true;

      ajdBlock.classList.add(np.oppositeSide);
      ajdBlock.open[np.oppositeSide] = true;
    },
    100
  );
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

Maze.prototype.generateRandomEnd = function () {
  this.reset();

  var randomX = Math.floor(Math.random() * this.bounds.x);
  var randomY = Math.floor(Math.random() * this.bounds.y);
  this.targetPosition = new Point(randomX, randomY);

  document.querySelector(".target").classList.remove("target");
  this.getBlock(this.targetPosition).classList.add("target");

  var self = this;
  return this.generate().then(function () {
    self.setPlayerPosition(self.startPosition);
  });
};

Maze.prototype.solveAStar = function () {
  if (this.solving || this.reseting) {
    return;
  }

  function updateDescription(newContent) {
    var descriptionElement = document.getElementById("description");
    descriptionElement.innerHTML = newContent;
  }

  updateDescription(`
        <h1 style="text-align:center;
        color: white;
        font-size: 3rem;">A* Algorithm</h1>
        <p style="font-size:1.3rem">
          A* (pronounced "A-star") is a powerful graph traversal and pathfinding algorithm widely used in artificial intelligence and computer science. It is mainly used to find the shortest path between two nodes in a graph, given the estimated cost of getting from the current node to the destination node. The main advantage of the algorithm is its ability to provide an optimal path by exploring the graph in a more informed way compared to traditional search algorithms such as Dijkstra's algorithm.
        </p>
      `);

  function updatetime(newContent) {
    var descriptionElement = document.getElementById("time-complexity");
    descriptionElement.innerHTML = newContent;
  }

  updatetime(`
        <h1 style="text-align:center;
        color: white;
        font-size: 3rem;">Time Complexity</h1>
        <p style="font-size:1.3rem">
          The time complexity of A* depends on the heuristic. In the worst case of an unbounded search space, the number of nodes expanded is exponential in the depth of the solution (the shortest path) d: O(b^d), where b is the branching factor (the average number of successors per state).
        </p>
      `);

  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var queue = new PriorityQueue((a, b) => a.f - b.f);
  queue.queue({ position: startPosition, f: 0, g: 0 });
  var self = this;

  return whileAsync(
    () => {
      return queue.length() > 0 && !position.equals(self.targetPosition);
    },
    () => {
      var node = queue.dequeue();
      position = node.position;
      var block = self.getBlock(position);

      if (visited.has(position.serialize())) {
        return;
      }

      visited.add(position.serialize());
      block.classList.add("visited");

      for (var side in block.open) {
        if (!block.open[side]) {
          continue;
        }

        var nextPosition = position.offset(
          self.delta[self.sides.indexOf(side)]
        );

        if (
          !nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())
        ) {
          continue;
        }

        nextPosition.previous = position;

        var g = node.g + heuristic(position, nextPosition);
        var h = heuristic(nextPosition, self.targetPosition);
        var f = g + h;
        queue.queue({ position: nextPosition, f: f, g: g });
      }
    }
  )
    .then(function () {
      var path = [];
      while (!position.equals(startPosition)) {
        path.push(position);
        position = position.previous;
      }

      var i = path.length;
      whileAsync(
        () => i > 0,
        () => {
          self.getBlock(path[--i]).classList.add("path");
        },
        1,
        5
      );

      return whileAsync(
        () => path.length > 0,
        () => {
          self.setPlayerPosition(path.pop());
        },
        1,
        100
      );
    })
    .then(function () {
      self.solving = false;
    });
};
