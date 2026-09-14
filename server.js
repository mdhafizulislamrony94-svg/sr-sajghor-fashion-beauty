const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(cookieParser());

// ================= SECURE ADMIN PANEL =================

app.get("/admin.html", (req, res) => {

    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {
        return res.redirect("/admin-login.html");
    }

    res.sendFile(path.join(__dirname, "admin.html"));
});


// ================= STATIC FILES =================

// ================= SECURE ADMIN PANEL =================

app.get("/admin-panel.html", (req, res) => {

    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {
        return res.redirect("/admin-login.html");
    }

    res.sendFile(
        path.join(__dirname, "admin-panel.html")
    );
});

app.use(express.static(__dirname));

// ================= ADMIN LOGIN SESSION =================

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "SRadmin321@";

const adminSessions = new Set();

function getCookie(req, name) {
    const cookies = req.headers.cookie || "";

    const cookie = cookies
        .split(";")
        .map(item => item.trim())
        .find(item => item.startsWith(name + "="));

    if (!cookie) {
        return null;
    }

    return cookie.substring(name.length + 1);
}


// ================= ADMIN LOGIN API =================

app.post("/api/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (
        username !== ADMIN_USERNAME ||
        password !== ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            success: false,
            message: "Username অথবা Password ভুল!"
        });
    }

    const token = crypto.randomBytes(32).toString("hex");

    adminSessions.add(token);

    res.setHeader(
        "Set-Cookie",
        `adminToken=${token}; HttpOnly; SameSite=Strict; Path=/`
    );

    res.json({
        success: true,
        message: "Admin Login সফল হয়েছে!"
    });
});

// ================= CHECK ADMIN LOGIN =================

app.get("/api/admin/check", (req, res) => {

    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {
        return res.status(401).json({
            success: false,
            message: "Admin Login required"
        });
    }

    res.json({
        success: true,
        message: "Admin Login আছে"
    });
});

// ================= ADMIN LOGOUT =================

app.post("/api/admin/logout", (req, res) => {

    const token = getCookie(req, "adminToken");

    if (token) {
        adminSessions.delete(token);
    }

    res.setHeader(
        "Set-Cookie",
        "adminToken=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
    );

    res.json({
        success: true,
        message: "Admin Logout সফল হয়েছে!"
    });
});

// ================= IMAGE UPLOAD =================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const ext =
            path.extname(file.originalname).toLowerCase();

        cb(
            null,
            Date.now() + ext
        );

    }

});

const upload = multer({

    storage: storage,

    fileFilter: (req, file, cb) => {

        const allowed = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        ];

        const ext =
            path.extname(file.originalname).toLowerCase();

        if (allowed.includes(ext)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "শুধু JPG, JPEG, PNG অথবা WEBP ছবি আপলোড করা যাবে।"
                )
            );

        }

    }

});


// ================= VIDEO UPLOAD =================

const videoDir = path.join(__dirname, "videos");

if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, {
        recursive: true
    });
}

const videoStorage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, videoDir);
    },

    filename: (req, file, cb) => {

        const ext =
            path.extname(file.originalname).toLowerCase();

        cb(
            null,
            "video-" + Date.now() + ext
        );

    }

});

const videoUpload = multer({

    storage: videoStorage,

    limits: {
         fileSize: 500 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowed = [
            ".mp4",
            ".webm",
            ".ogg"
        ];

        const ext =
            path.extname(file.originalname).toLowerCase();

        if (allowed.includes(ext)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "শুধু MP4, WEBM অথবা OGG ভিডিও আপলোড করা যাবে।"
                )
            );

        }

    }

});


// Upload Image API

app.post(
    "/api/products/upload-image",
    upload.single("image"),
    (req, res) => {

        // Admin Login Check
const token = getCookie(req, "adminToken");

if (!token || !adminSessions.has(token)) {
    return res.status(401).json({
        success: false,
        message: "Admin Login required"
    });
}

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "ছবি নির্বাচন করুন।"

            });

        }

        res.json({

            success: true,

            message:
                "✅ ছবি সফলভাবে Upload হয়েছে।",

            image:
                "/uploads/" + req.file.filename

        });

    }
);

app.post(
    "/api/videos/upload",
    function (req, res, next) {
        if (!req.cookies || !req.cookies.adminToken) {
            return res.status(401).json({
                success: false,
                message: "আগে Admin Login করুন"
            });
        }

        next();
    },
    videoUpload.single("video"),
    function (req, res) {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "কোনো ভিডিও নির্বাচন করা হয়নি"
            });
        }

const productName = req.body.productName || "";
const productPrice = req.body.productPrice || "";

const videoData = {
    name: req.file.filename,
    url: "/videos/" + req.file.filename,
    productName: productName,
    productPrice: productPrice,
    createdAt: new Date().toISOString()
};

videos.push(videoData);

saveVideos();

res.json({
    success: true,
    message: "ভিডিও সফলভাবে আপলোড হয়েছে",
    video: videoData
});
    }
);

// ================= VIDEO DATA =================

const videosFile = path.join(__dirname, "videos.json");

function loadVideos() {

    if (!fs.existsSync(videosFile)) {

        fs.writeFileSync(
            videosFile,
            "[]",
            "utf8"
        );

        return [];
    }

    try {

        const data = fs.readFileSync(
            videosFile,
            "utf8"
        );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "❌ videos.json পড়া যায়নি:",
            error
        );

        return [];
    }
}

let videos = loadVideos();

function saveVideos() {

    fs.writeFileSync(
        videosFile,
        JSON.stringify(videos, null, 2),
        "utf8"
    );
}

// ================= PRODUCTS =================

const productsFile = path.join(__dirname, "products.json");

function loadProducts() {

    if (!fs.existsSync(productsFile)) {

        fs.writeFileSync(
            productsFile,
            "[]",
            "utf8"
        );

        return [];
    }

    try {

        const data = fs.readFileSync(
            productsFile,
            "utf8"
        );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "❌ products.json পড়া যায়নি:",
            error
        );

        return [];
    }
}


let products = loadProducts();


function saveProducts() {

    fs.writeFileSync(
        productsFile,
        JSON.stringify(products, null, 2),
        "utf8"
    );

}


// ================= ORDERS =================

const ordersFile = path.join(__dirname, "orders.json");


function loadOrders() {

    if (!fs.existsSync(ordersFile)) {

        fs.writeFileSync(
            ordersFile,
            "[]",
            "utf8"
        );

        return [];
    }


    try {

        const data = fs.readFileSync(
            ordersFile,
            "utf8"
        );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "❌ orders.json পড়া যায়নি:",
            error
        );

        return [];
    }
}


let orders = loadOrders();


function saveOrders() {

    fs.writeFileSync(
        ordersFile,
        JSON.stringify(orders, null, 2),
        "utf8"
    );

}


// ================= PRODUCT API =================


// Get Products

app.get("/api/products", (req, res) => {

    res.json({

        success: true,

        products: products

    });

});

// Add Product

app.post("/api/products", (req, res) => {

        // Admin Login Check
    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {
        return res.status(401).json({
            success: false,
            message: "Admin Login required"
        });
    }

    const {
        name,
        price,
        stock,
        category,
        description,
        image
    } = req.body;


    if (
        !name ||
        price === undefined ||
        stock === undefined ||
        !category
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Product-এর প্রয়োজনীয় তথ্য দিন।"

        });

    }


    const newProduct = {

        id:
            Date.now(),

        name:
            name,

        price:
            Number(price),

        stock:
            Number(stock),

        category:
            category,

        description:
            description || "",

        image:
            image || ""

    };


    products.push(newProduct);

    saveProducts();

console.log("✅ নতুন Product যোগ হয়েছে:", newProduct);
console.log("📦 মোট Product:", products.length);

    res.json({

        success: true,

        message:
            "✅ Product সফলভাবে যোগ হয়েছে।",

        product:
            newProduct

    });

});


// Update Product

app.put("/api/products/:id", (req, res) => {

   // Admin Login Check
const token = getCookie(req, "adminToken");

if (!token || !adminSessions.has(token)) {
    return res.status(401).json({
        success: false,
        message: "Admin Login required"
    });
}

    const id =
        Number(req.params.id);


    const product =
        products.find(
            item => item.id === id
        );


    if (!product) {

        return res.status(404).json({

            success: false,

            message:
                "Product পাওয়া যায়নি।"

        });

    }


    const {
        name,
        price,
        stock,
        category,
        description,
        image
    } = req.body;


    if (name !== undefined)
        product.name = name;


    if (price !== undefined)
        product.price = Number(price);


    if (stock !== undefined)
        product.stock = Number(stock);


    if (category !== undefined)
        product.category = category;


    if (description !== undefined)
        product.description = description;


    if (image !== undefined)
        product.image = image;


    saveProducts();


    res.json({

        success: true,

        message:
            "✅ Product আপডেট হয়েছে।",

        product:
            product

    });

});


// Delete Product

app.delete("/api/products/:id", (req, res) => {

    // Admin Login Check
const token = getCookie(req, "adminToken");

if (!token || !adminSessions.has(token)) {
    return res.status(401).json({
        success: false,
        message: "Admin Login required"
    });
}

    const id =
        Number(req.params.id);


    const productIndex =
        products.findIndex(
            item => item.id === id
        );


    if (productIndex === -1) {

        return res.status(404).json({

            success: false,

            message:
                "Product পাওয়া যায়নি।"

        });

    }


    products.splice(
        productIndex,
        1
    );


    saveProducts();


    res.json({

        success: true,

        message:
            "🗑️ Product মুছে ফেলা হয়েছে।"

    });

});


// ================= ORDER API =================

app.post("/api/orders", (req, res) => {

    const {
        name,
        phone,
        address,
        note,
        products: orderedProducts,
        total
    } = req.body;


    // ================= BASIC CHECK =================

    if (
        !name ||
        !phone ||
        !address ||
        !Array.isArray(orderedProducts) ||
        orderedProducts.length === 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "সব তথ্য পূরণ করুন।"

        });

    }


    // ================= CHECK STOCK =================

    for (const item of orderedProducts) {

        const productId =
            Number(item.id ?? item.productId);

        const quantity =
            Number(item.quantity || 1);


        const product =
            products.find(
                p => Number(p.id) === productId
            );


        if (!product) {

            return res.status(400).json({

                success: false,

                message:
                    `"${item.name || "Product"}" পাওয়া যায়নি।`

            });

        }


        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Product quantity সঠিক নয়।"

            });

        }


        if (Number(product.stock) < quantity) {

            return res.status(400).json({

                success: false,

                message:
                    `"${product.name}" এর পর্যাপ্ত Stock নেই। বর্তমানে Stock: ${product.stock}`

            });

        }

    }


    // ================= REDUCE STOCK =================

    for (const item of orderedProducts) {

        const productId =
            Number(item.id ?? item.productId);

        const quantity =
            Number(item.quantity || 1);


        const product =
            products.find(
                p => Number(p.id) === productId
            );


        product.stock =
            Number(product.stock) - quantity;

    }


    // ================= SAVE PRODUCT STOCK =================

    saveProducts();


    // ================= CREATE ORDER =================

    const orderId =
        "SZ" + Date.now();


    const newOrder = {

        orderId:
            orderId,

        name:
            name,

        phone:
            phone,

        address:
            address,

        note:
            note || "",

        products:
            orderedProducts,

        total:
            Number(total),

        status:
            "pending",

        createdAt:
            new Date().toISOString()

    };


    orders.push(newOrder);

    saveOrders();


    console.log(
        "📦 নতুন Order:",
        newOrder
    );

    console.log(
        "📦 Product Stock automatically কমেছে।"
    );


    res.json({

        success: true,

        message:
            "অর্ডার সফলভাবে গ্রহণ করা হয়েছে এবং Stock আপডেট হয়েছে।",

        order:
            newOrder

    });

});

// ================= GET ADMIN ORDERS =================

app.get("/api/orders", (req, res) => {

    // Admin Login Check
    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {
        return res.status(401).json({
            success: false,
            message: "Admin Login required"
        });
    }

    res.json({
        success: true,
        orders: orders
    });

});

// ================= UPDATE ORDER STATUS =================

app.put(
    "/api/orders/:orderId/status",
    (req, res) => {

        // Admin Login Check
        const token = getCookie(req, "adminToken");

        if (!token || !adminSessions.has(token)) {
            return res.status(401).json({
                success: false,
                message: "Admin Login required"
            });
        }

        const orderId = req.params.orderId;

        const { status } = req.body;

        const allowedStatus = [
            "pending",
            "confirmed",
            "delivered",
            "cancelled"
        ];

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "ভুল Status"
            });
        }

        // Find Order
        const order = orders.find(
            item => item.orderId === orderId
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "অর্ডার পাওয়া যায়নি"
            });
        }

        // ================= CANCEL ORDER =================

        if (
            status === "cancelled" &&
            order.status !== "cancelled"
        ) {

            // Delivered Order Cancel করা যাবে না
            if (order.status === "delivered") {
                return res.status(400).json({
                    success: false,
                    message:
                        "Delivered Order Cancel করা যাবে না।"
                });
            }

            // Order-এর Products Stock ফেরত দিন
            if (Array.isArray(order.products)) {

                for (const item of order.products) {

                    const productId =
                        Number(item.id ?? item.productId);

                    const quantity =
                        Number(item.quantity || 1);

                    const product =
                        products.find(
                            p => Number(p.id) === productId
                        );

                    if (product) {

                        product.stock =
                            Number(product.stock) + quantity;

                        console.log(
                            `🔄 Stock ফেরত: ${product.name} +${quantity}`
                        );

                    }
                }

                // Products Save
                saveProducts();
            }

            // Order Status Cancelled
            order.status = "cancelled";

            // Orders Save
            saveOrders();

            console.log(
                "❌ Order Cancelled:",
                order.orderId
            );

            res.json({
                success: true,
                message:
                    "Order Cancel হয়েছে এবং Stock automatically ফেরত দেওয়া হয়েছে।",
                order: order
            });

            return;
        }


       // ================= NORMAL STATUS UPDATE =================

const oldStatus = order.status;

order.status = status;


// ================= CUSTOMER NOTIFICATION =================

if (status === "confirmed" && oldStatus !== "confirmed") {

    order.notification = {
        message:
            "🎉 আপনার অর্ডারটি Confirm করা হয়েছে। SR Sajghor Fashion & Beauty-এর পক্ষ থেকে ধন্যবাদ ❤️",
        read: false,
        createdAt: new Date().toISOString()
    };

}


// ================= CANCEL NOTIFICATION =================

if (status === "cancelled" && oldStatus !== "cancelled") {

    order.notification = {
        message:
            "❌ আপনার অর্ডারটি Cancel করা হয়েছে। প্রয়োজনে আমাদের সাথে যোগাযোগ করুন।",
        read: false,
        createdAt: new Date().toISOString()
    };

}


saveOrders();


res.json({
    success: true,
    message:
        "Order Status আপডেট হয়েছে এবং Customer Notification তৈরি হয়েছে।",
    order: order
});

});  

// ================= CUSTOMER ORDER STATUS =================

app.get(
    "/api/customer-order/:orderId",
    (req, res) => {

        const orderId =
            req.params.orderId;

        const order =
            orders.find(
                item =>
                    item.orderId === orderId
            );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order পাওয়া যায়নি"
            });
        }

        // Customer-এর ব্যক্তিগত তথ্য পাঠাব না
       res.json({
    success: true,

    order: {
        orderId: order.orderId,
        status: order.status,

        notification:
            order.notification || null,

        products: Array.isArray(order.products)
            ? order.products.map(item => ({
                id: item.id ?? item.productId,
                productId: item.productId ?? item.id
            }))
            : []
    }
});

    }
);

// ================= DELETE ORDER =================

app.delete(
    "/api/orders/:orderId",
    (req, res) => {

        // Admin Login Check
        const token = getCookie(req, "adminToken");

        if (!token || !adminSessions.has(token)) {
            return res.status(401).json({
                success: false,
                message: "Admin Login required"
            });
        }

        const orderId =
            req.params.orderId;


        const orderIndex =
            orders.findIndex(
                order =>
                    order.orderId === orderId
            );


        if (orderIndex === -1) {

            return res.status(404).json({

                success: false,

                message:
                    "অর্ডার পাওয়া যায়নি"

            });

        }


        orders.splice(
            orderIndex,
            1
        );


        saveOrders();


        res.json({

            success: true,

            message:
                "অর্ডার মুছে ফেলা হয়েছে"

        });

    }
);

// ================= PRODUCT REVIEWS =================

const reviewsFile = path.join(__dirname, "reviews.json");

app.post("/api/reviews", (req, res) => {

    try {

        const {
            productId,
            productName,
            rating,
            review
        } = req.body;

        if (!productId || !rating || !review) {
            return res.status(400).json({
                success: false,
                message: "সব তথ্য দিতে হবে।"
            });
        }

        let reviews = [];

        if (fs.existsSync(reviewsFile)) {
            reviews = JSON.parse(
                fs.readFileSync(reviewsFile, "utf8")
            );
        }

        const newReview = {
            id: Date.now(),
            productId: productId,
            productName: productName || "",
            rating: Number(rating),
            review: review,
            createdAt: new Date().toISOString()
        };

        reviews.push(newReview);

        fs.writeFileSync(
            reviewsFile,
            JSON.stringify(reviews, null, 2),
            "utf8"
        );

        res.json({
            success: true,
            message: "Review সফলভাবে Save হয়েছে!",
            review: newReview
        });

    } catch (error) {

        console.error("Review Save Error:", error);

        res.status(500).json({
            success: false,
            message: "Review Save করা যায়নি।"
        });
    }
});

// ================= GET PRODUCT REVIEWS =================

app.get("/api/reviews/:productId", (req, res) => {
    try {
        const productId = String(req.params.productId);

        let reviews = [];

        if (fs.existsSync(reviewsFile)) {
            reviews = JSON.parse(
                fs.readFileSync(reviewsFile, "utf8")
            );
        }

        const productReviews = reviews.filter(
            review => String(review.productId) === productId
        );

        res.json({
            success: true,
            reviews: productReviews
        });

    } catch (error) {
        console.error("Get Reviews Error:", error);

        res.status(500).json({
            success: false,
            message: "Review পাওয়া যায়নি।"
        });
    }
});


// ================= GET VIDEOS =================

app.get("/api/videos", (req, res) => {
    res.json({
        success: true,
        videos: videos
    });
});


// ================= DELETE VIDEO =================

app.delete("/api/videos/:filename", (req, res) => {

    // Admin Login Check
    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {
        return res.status(401).json({
            success: false,
            message: "Admin Login required"
        });
    }

    const filename = path.basename(req.params.filename);
    const filePath = path.join(videoDir, filename);

    fs.unlink(filePath, (err) => {

        if (err) {
            return res.status(404).json({
                success: false,
                message: "ভিডিও পাওয়া যায়নি"
            });
        }

        // videos.json থেকেও ভিডিওটি বাদ দেওয়া
        videos = videos.filter(function(video) {
            return video.name !== filename;
        });

        saveVideos();

        res.json({
            success: true,
            message: "ভিডিও সফলভাবে Delete হয়েছে"
        });
    });
});


// ================= SERVER =================

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("✅ SR Sajghor Server চালু হয়েছে!");
    console.log("🌐 Server চলছে");
    console.log("PORT:", PORT);
    console.log("=================================");
});

server.on("error", (err) => {
    console.error("❌ Server Error:", err);
});

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err);
});
