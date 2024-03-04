const express = require("express");
const app = express();
const pg = require("pg");

const client = new pg.Client(
    process.env.DATABSE_URL || "postgres://localhost/acme_hr_directory"
);

const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(require("morgan")("dev"));

// Routes

// Displaying all departments
app.get("/api/departments", async (req, res, next) => {
    try {
        const SQL = `
         SELECT * FROM departments;
        `;
        const response = await client.query(SQL);
        res.status(200).send(response.rows);
    } catch (error) {
        console.log(error);
        next(error);
    }
});

// Displaying all employees
app.get("/api/employees", async (req, res, next) => {
    try {
        //The department name visible in the employees table for readability.
        const SQL = `
        SELECT e.id, e.name, e.salary, e.department_id, d.name AS department_name
        FROM employees e
        INNER JOIN departments d ON e.department_id = d.id;
        `;
        const response = await client.query(SQL);
        res.status(200).send(response.rows);
    } catch (error) {
        console.log(error);
        next(error);
    }
});
// Creating a new employeee
app.post("/api/employees", async (req, res, next) => {
    try {
        const SQL = `
        INSERT INTO employees(name, salary, department_id)
        VALUES ($1, $2, $3)
        RETURNING *
        `;

        const response = await client.query(SQL, [
            req.body.name,
            req.body.salary,
            req.body.department_id,
        ]);

        res.status(201).send(response.rows);
    } catch (error) {
        console.log(error);
        next(error);
    }
});
// Update an employee
app.put("/api/employees/:id", async (req, res, next) => {
    try {
        const SQL = `
        UPDATE employees
        SET name=$1, salary=$2, department_id=$3, updated_at= now()
        WHERE id=$4 RETURNING *
        `;

        const response = await client.query(SQL, [
            req.body.name,
            req.body.salary,
            req.body.department_id,
            req.params.id,
        ]);
        res.status(200).send(response.rows[0]);
    } catch (error) {
        console.log(error);
        next(error);
    }
});
// Delete an employee
app.delete("/api/employees/:id", async (req, res, next) => {
    try {
        const SQL = `
        DELETE FROM employees
        WHERE id = $1
        `;
        const response = await client.query(SQL, [req.params.id]);
        res.sendStatus(204);
    } catch (error) {
        console.log(error);
        next(error);
    }
});

// Init function
async function init() {
    try {
        await client.connect();
        console.log("Connected to Database! 🤩");

        // Enable uuid-ossp extension
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');


        // "CASCADE" will automatically drop any dependent objects, such as foreign key constraints, along with the table.
        let SQL = `
        DROP TABLE IF EXISTS departments CASCADE;
        DROP TABLE IF EXISTS employees CASCADE;

        CREATE TABLE departments(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100)
        );
        
        CREATE TABLE employees(
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            name VARCHAR(100) NOT NULL,
            salary VARCHAR(100) NOT NULL,
            department_id INTEGER REFERENCES departments(id) NOT NULL
        );
        `;

        await client.query(SQL);
        console.log("Tables Created 📊!");

        SQL = `
        INSERT INTO departments(name) VALUES
        ('Human Resources'),
        ('Area Management'),
        ('IT Support'),
        ('Software Developer');

        INSERT INTO employees(name, salary,department_id) VALUES
        ('Steve De La Rosa','$85,000',(SELECT id FROM departments WHERE name='Software Developer')),
        ('Jina Raune','$55,961',(SELECT id FROM  departments WHERE name='IT Support')),
        ('Yilda Oprimis','$79,005',(SELECT id FROM  departments WHERE name='Area Management')),
        ('Jorge Maine','$71,424',(SELECT  id FROM departments WHERE name='Human Resources'));
        `;

        await client.query(SQL);
        console.log("Data Seeded ✅🥳");

        app.listen(port, () => console.log(`Listenning on port ${port}`));
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

init();
