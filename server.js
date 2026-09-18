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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ADMIN LOGIN SESSION =================

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "SRadmin123!";

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

// ================= ADMIN AUTH MIDDLEWARE =================

function requireAdmin(req, res, next) {

    const token = getCookie(req, "adminToken");

    if (!token || !adminSessions.has(token)) {

        return res.status(401).json({
            success: false,
            message: "Admin Login required"
        });

    }

    next();
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

const storageRoot =
    process.env.RAILWAY_VOLUME_MOUNT_PATH || "/data";

const uploadDir =
    path.join(storageRoot, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

app.use(
    "/uploads",
    express.static(uploadDir)
);

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

const videoDir = path.join(storageRoot, "videos");

if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, {
        recursive: true
    });
}

app.use("/videos", express.static(videoDir));

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
    requireAdmin,
    upload.single("image"),
    (req, res) => {

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

// ================= VIDEO UPLOAD =================

app.post(
    "/api/videos/upload",

    requireAdmin,

    videoUpload.single("video"),

    function (req, res) {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "কোনো ভিডিও নির্বাচন করা হয়নি"
            });

        }

        const productName =
            req.body.productName || "";

        const productPrice =
            req.body.productPrice || "";

        const videoData = {

            name: req.file.filename,

            url:
                "/videos/" +
                req.file.filename,

            productName:
                productName,

            productPrice:
                productPrice,

            createdAt:
                new Date().toISOString()

        };

        videos.push(videoData);

        saveVideos();

        res.json({

            success: true,

            message:
                "ভিডিও সফলভাবে আপলোড হয়েছে",

            video:
                videoData

        });

    }
);


// ================= VIDEO DATA =================

const videosFile = path.join(storageRoot, "videos.json");

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

app.post("/api/products", requireAdmin, (req, res) => {

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

app.put("/api/products/:id",requireAdmin, (req, res) => {

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

    // Admin Login Chec

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

// ================= CUSTOMER ID =================

let customerId = null;

const customerToken =
    req.cookies.customerToken;

if (
    customerToken &&
    global.customerSessions
) {

    customerId =
        global.customerSessions.get(
            customerToken
        ) || null;

}
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

    customerId:
        customerId,

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

app.get("/api/orders", requireAdmin, (req, res) => {

    // Admin Login Check

    res.json({
        success: true,
        orders: orders
    });

});

// ================= UPDATE ORDER STATUS =================

app.put(
    "/api/orders/:orderId/status",
    requireAdmin,
    (req, res) => {


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
    requireAdmin,
    (req, res) => {

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

// ================= CUSTOMER ACCOUNT SYSTEM =================

const customersFile = path.join(__dirname, "customers.json");

function loadCustomers() {

    if (!fs.existsSync(customersFile)) {

        fs.writeFileSync(
            customersFile,
            "[]",
            "utf8"
        );

        return [];
    }

    try {

        const data =
            fs.readFileSync(
                customersFile,
                "utf8"
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "❌ customers.json পড়া যায়নি:",
            error
        );

        return [];
    }
}


let customers = loadCustomers();


function saveCustomers() {

    fs.writeFileSync(
        customersFile,
        JSON.stringify(
            customers,
            null,
            2
        ),
        "utf8"
    );

}


// ================= PASSWORD HASH =================

function hashPassword(password) {

    const salt =
        crypto.randomBytes(16).toString("hex");

    const hash =
        crypto
            .scryptSync(
                password,
                salt,
                64
            )
            .toString("hex");

    return {
        salt: salt,
        hash: hash
    };
}


// ================= CUSTOMER SIGNUP API =================

app.post(
    "/api/customer/signup",
    (req, res) => {

        try {

            const {
                name,
                phone,
                email,
                password
            } = req.body;


            // ================= BASIC CHECK =================

            if (
                !name ||
                !phone ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "সব তথ্য পূরণ করুন।"

                });

            }


            // ================= PASSWORD CHECK =================

            if (password.length < 6) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password কমপক্ষে ৬ অক্ষরের হতে হবে।"

                });

            }


            // ================= PHONE CHECK =================

            if (
                !/^01[3-9]\d{8}$/.test(phone)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।"

                });

            }


            // ================= EMAIL CHECK =================

            const normalizedEmail =
                email.trim().toLowerCase();


            // ================= DUPLICATE CHECK =================

            const existingCustomer =
                customers.find(
                    customer =>
                        customer.email ===
                            normalizedEmail ||
                        customer.phone ===
                            phone
                );


            if (existingCustomer) {

                return res.status(409).json({

                    success: false,

                    message:
                        "এই Email অথবা Mobile Number দিয়ে Account আগে থেকেই আছে।"

                });

            }


            // ================= PASSWORD HASH =================

            const passwordData =
                hashPassword(password);


            // ================= CREATE CUSTOMER =================

            const newCustomer = {

                customerId:
                    "CUS" + Date.now(),

                name:
                    name.trim(),

                phone:
                    phone,

                email:
                    normalizedEmail,

                passwordHash:
                    passwordData.hash,

                passwordSalt:
                    passwordData.salt,

                createdAt:
                    new Date().toISOString()

            };


            // ================= SAVE =================

            customers.push(
                newCustomer
            );

            saveCustomers();


            console.log(
                "✅ নতুন Customer Account তৈরি হয়েছে:",
                newCustomer.customerId
            );


            // ================= RESPONSE =================

            res.status(201).json({

                success: true,

                message:
                    "🎉 Customer Account সফলভাবে তৈরি হয়েছে!",

                customer: {

                    customerId:
                        newCustomer.customerId,

                    name:
                        newCustomer.name,

                    phone:
                        newCustomer.phone,

                    email:
                        newCustomer.email

                }

            });


        } catch (error) {

            console.error(
                "❌ Customer Signup Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Account তৈরি করা যায়নি।"

            });

        }

    }
);

// ================= CUSTOMER LOGIN SYSTEM =================

function verifyPassword(password, salt, storedHash) {

    const hash =
        crypto
            .scryptSync(
                password,
                salt,
                64
            )
            .toString("hex");

    return crypto.timingSafeEqual(
        Buffer.from(hash, "hex"),
        Buffer.from(storedHash, "hex")
    );

}


// ================= CUSTOMER LOGIN API =================

app.post(
    "/api/customer/login",
    (req, res) => {

        try {

            const {
                login,
                password
            } = req.body;


            // ================= BASIC CHECK =================

            if (
                !login ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email/Mobile এবং Password দিন।"

                });

            }


            const normalizedLogin =
                login.trim().toLowerCase();


            // ================= FIND CUSTOMER =================

            const customer =
                customers.find(
                    customer =>
                        customer.email ===
                            normalizedLogin ||
                        customer.phone ===
                            login.trim()
                );


            if (!customer) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email অথবা Mobile Number পাওয়া যায়নি।"

                });

            }


            // ================= PASSWORD VERIFY =================

            const passwordCorrect =
                verifyPassword(
                    password,
                    customer.passwordSalt,
                    customer.passwordHash
                );


            if (!passwordCorrect) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Password সঠিক নয়।"

                });

            }


            // ================= CUSTOMER SESSION =================

            const customerToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            // Customer session-এর জন্য
            // temporary memory storage

            if (
                !global.customerSessions
            ) {

                global.customerSessions =
                    new Map();

            }


            global.customerSessions.set(
                customerToken,
                customer.customerId
            );


            // ================= COOKIE =================

            res.cookie(
                "customerToken",
                customerToken,
                {

                    httpOnly: true,

                    sameSite: "lax",

                    secure:
                        process.env.NODE_ENV ===
                        "production",

                    maxAge:
                        7 * 24 * 60 * 60 * 1000

                }
            );


            // ================= SUCCESS =================

            console.log(
                "✅ Customer Login:",
                customer.customerId
            );


            res.json({

                success: true,

                message:
                    "Customer Login সফল হয়েছে!",

                customer: {

                    customerId:
                        customer.customerId,

                    name:
                        customer.name,

                    phone:
                        customer.phone,

                    email:
                        customer.email

                }

            });


        } catch (error) {

            console.error(
                "❌ Customer Login Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Login করা যায়নি।"

            });

        }

    }
);

// ================= CUSTOMER LOGOUT API =================

app.post(
    "/api/customer/logout",
    (req, res) => {

        try {

            const token =
                req.cookies.customerToken;

            if (token && global.customerSessions) {

                global.customerSessions.delete(token);

            }

            res.clearCookie(
                "customerToken",
                {
                    httpOnly: true,
                    sameSite: "lax",
                    secure:
                        process.env.NODE_ENV ===
                        "production"
                }
            );

            res.json({

                success: true,

                message:
                    "Customer Logout সফল হয়েছে!"

            });

        } catch (error) {

            console.error(
                "❌ Customer Logout Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Logout করা যায়নি।"

            });

        }

    }
);

// ================= CUSTOMER MY ORDERS API =================

app.get(
    "/api/customer/orders",
    (req, res) => {

        try {

            const token =
                req.cookies.customerToken;

            if (!token || !global.customerSessions) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Customer Login করা নেই।"
                });

            }

            const customerId =
                global.customerSessions.get(token);

            if (!customerId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Session expired। আবার Login করুন।"
                });

            }

            const customer =
                customers.find(
                    customer =>
                        customer.customerId ===
                        customerId
                );

            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Customer পাওয়া যায়নি।"
                });

            }

            const ordersFile =
                path.join(__dirname, "orders.json");

            let orders = [];

            if (fs.existsSync(ordersFile)) {

                try {

                    orders =
                        JSON.parse(
                            fs.readFileSync(
                                ordersFile,
                                "utf8"
                            )
                        );

                } catch (error) {

                    orders = [];

                }

            }

            const customerOrders =
                orders.filter(order =>

                    order.customerId ===
                    customerId

                );

            res.json({

                success: true,

                orders:
                    customerOrders

            });

        } catch (error) {

            console.error(
                "❌ Customer Orders Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Order History পাওয়া যায়নি।"

            });

        }

    }
);

// ================= CUSTOMER PROFILE API =================

app.get(
    "/api/customer/me",
    (req, res) => {

        try {

            const token =
                req.cookies.customerToken;

            if (!token) {

                return res.status(401).json({
                    success: false,
                    message: "Customer Login করা নেই।"
                });

            }

            if (!global.customerSessions) {

                return res.status(401).json({
                    success: false,
                    message: "Session পাওয়া যায়নি।"
                });

            }

            const customerId =
                global.customerSessions.get(token);

            if (!customerId) {

                return res.status(401).json({
                    success: false,
                    message: "Session expired। আবার Login করুন।"
                });

            }

            const customer =
                customers.find(
                    customer =>
                        customer.customerId ===
                        customerId
                );

            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message: "Customer পাওয়া যায়নি।"
                });

            }

            res.json({

                success: true,

                customer: {

                    customerId:
                        customer.customerId,

                    name:
                        customer.name,

                    phone:
                        customer.phone,

                    email:
                        customer.email

                }

            });

        } catch (error) {

            console.error(
                "❌ Customer Profile Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Customer তথ্য পাওয়া যায়নি।"
            });

        }

    }
);

// ================= CUSTOMER PROFILE UPDATE API =================

app.put(
    "/api/customer/profile",
    (req, res) => {

        try {

            const token =
                req.cookies.customerToken;

            if (
                !token ||
                !global.customerSessions
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Customer Login করা নেই।"
                });
            }

            const customerId =
                global.customerSessions.get(token);

            if (!customerId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Session expired। আবার Login করুন।"
                });
            }

            const customer =
                customers.find(
                    customer =>
                        customer.customerId ===
                        customerId
                );

            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Customer পাওয়া যায়নি।"
                });
            }


            const {
                name,
                email
            } = req.body;


            if (!name || !email) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Name এবং Email পূরণ করুন।"
                });
            }


            const normalizedEmail =
                email.trim().toLowerCase();


            const emailExists =
                customers.some(
                    otherCustomer =>
                        otherCustomer.customerId !==
                            customerId &&
                        otherCustomer.email ===
                            normalizedEmail
                );


            if (emailExists) {

                return res.status(409).json({
                    success: false,
                    message:
                        "এই Email দিয়ে অন্য একটি Account আছে।"
                });
            }


            customer.name =
                name.trim();

            customer.email =
                normalizedEmail;


            saveCustomers();


            console.log(
                "✅ Customer Profile Updated:",
                customer.customerId
            );


            res.json({

                success: true,

                message:
                    "Profile সফলভাবে Update হয়েছে!",

                customer: {

                    customerId:
                        customer.customerId,

                    name:
                        customer.name,

                    phone:
                        customer.phone,

                    email:
                        customer.email

                }

            });


        } catch (error) {

            console.error(
                "❌ Customer Profile Update Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Profile Update করা যায়নি।"

            });

        }

    }
);


// ================= CUSTOMER ADDRESS API =================

// Customer-এর Address List দেখা
app.get(
    "/api/customer/addresses",
    (req, res) => {

        try {

            const token =
                req.cookies.customerToken;

            if (
                !token ||
                !global.customerSessions
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Customer Login করা নেই।"
                });
            }

            const customerId =
                global.customerSessions.get(token);

            if (!customerId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Session expired। আবার Login করুন।"
                });
            }

            const customer =
                customers.find(
                    customer =>
                        customer.customerId ===
                        customerId
                );

            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Customer পাওয়া যায়নি।"
                });
            }

            res.json({
                success: true,
                addresses:
                    customer.addresses || []
            });

        } catch (error) {

            console.error(
                "❌ Customer Address Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Address পাওয়া যায়নি।"
            });
        }
    }
);


// ================= ADD CUSTOMER ADDRESS =================

app.post(
    "/api/customer/addresses",
    (req, res) => {

        try {

            const token =
                req.cookies.customerToken;

            if (
                !token ||
                !global.customerSessions
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Customer Login করা নেই।"
                });
            }

            const customerId =
                global.customerSessions.get(token);

            if (!customerId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Session expired। আবার Login করুন।"
                });
            }

            const customer =
                customers.find(
                    customer =>
                        customer.customerId ===
                        customerId
                );

            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Customer পাওয়া যায়নি।"
                });
            }


            const {
                label,
                address
            } = req.body;


            if (!address || !address.trim()) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Delivery Address লিখুন।"
                });
            }


            if (!customer.addresses) {
                customer.addresses = [];
            }


            const newAddress = {

                id:
                    "ADDR" +
                    Date.now(),

                label:
                    label &&
                    label.trim()
                        ? label.trim()
                        : "Home",

                address:
                    address.trim(),

                createdAt:
                    new Date().toISOString()

            };


            customer.addresses.push(
                newAddress
            );


            saveCustomers();


            res.status(201).json({

                success: true,

                message:
                    "✅ Delivery Address যোগ হয়েছে!",

                address:
                    newAddress

            });

        } catch (error) {

            console.error(
                "❌ Add Address Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Address যোগ করা যায়নি।"

            });

        }

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

app.delete("/api/videos/:filename", requireAdmin, (req, res) => {


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
