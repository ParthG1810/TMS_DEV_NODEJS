-- ============================================
-- TMS Database Seed Data
-- ============================================
-- This file contains sample data for testing
-- Password for demo user: demo1234 (will need to be hashed with bcrypt)
-- ============================================
USE tms_db;

-- ============================================
-- Seed Users
-- ============================================
-- Note: Password hashes should be generated using bcrypt with salt rounds 10
-- For 'demo1234', the hash would be generated at runtime
-- Placeholder hash is shown here
-- All users have password: demo1234
-- Hash generated with: bcrypt.hash('demo1234', 10)
INSERT INTO
    users (
        id,
        display_name,
        email,
        password_hash,
        photo_url,
        phone_number,
        country,
        address,
        state,
        city,
        zip_code,
        about,
        role,
        is_public
    )
VALUES
    (
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        'Demo Admin',
        'demo@minimals.cc',
        '$2a$10$gwBdfq8Uj6YNfxyRU6SbAehqLeGMhXhl31B0lEHqEQPF0alDTYXT6',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_1.jpg',
        '+1234567890',
        'United States',
        '123 Main St',
        'California',
        'Los Angeles',
        '90001',
        'System administrator',
        'admin',
        TRUE
    ),
    (
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'John Doe',
        'john.doe@example.com',
        '$2a$10$gwBdfq8Uj6YNfxyRU6SbAehqLeGMhXhl31B0lEHqEQPF0alDTYXT6',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_2.jpg',
        '+1234567891',
        'United States',
        '456 Oak Ave',
        'New York',
        'New York',
        '10001',
        'Product designer',
        'user',
        TRUE
    ),
    (
        'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
        'Jane Smith',
        'jane.smith@example.com',
        '$2a$10$gwBdfq8Uj6YNfxyRU6SbAehqLeGMhXhl31B0lEHqEQPF0alDTYXT6',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_3.jpg',
        '+1234567892',
        'United Kingdom',
        '789 High St',
        'England',
        'London',
        'SW1A 1AA',
        'Frontend developer',
        'user',
        TRUE
    ),
    (
        'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
        'Mike Johnson',
        'mike.johnson@example.com',
        '$2a$10$gwBdfq8Uj6YNfxyRU6SbAehqLeGMhXhl31B0lEHqEQPF0alDTYXT6',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_4.jpg',
        '+1234567893',
        'Canada',
        '321 Maple Rd',
        'Ontario',
        'Toronto',
        'M5H 2N2',
        'Backend engineer',
        'user',
        TRUE
    );

-- ============================================
-- Seed Products
-- ============================================
INSERT INTO
    products (
        id,
        name,
        code,
        sku,
        price,
        price_sale,
        description,
        status,
        inventory_type,
        available,
        sold,
        total_rating,
        total_review,
        category,
        gender
    )
VALUES
    (
        'prod-001',
        'Nike Air Force 1 NDESTRUKT',
        'PROD-001',
        'SKU-001',
        129.99,
        99.99,
        '<p>The Nike Air Force 1 NDESTRUKT is a modern take on a classic silhouette. Featuring deconstructed design elements and premium materials.</p>',
        'sale',
        'in_stock',
        150,
        89,
        4.5,
        234,
        'Footwear',
        'Men'
    ),
    (
        'prod-002',
        'Nike Space Hippie 04',
        'PROD-002',
        'SKU-002',
        159.99,
        NULL,
        '<p>The Nike Space Hippie 04 is made from recycled materials and features a unique aesthetic inspired by sustainability.</p>',
        'new',
        'in_stock',
        200,
        45,
        4.7,
        156,
        'Footwear',
        'Unisex'
    ),
    (
        'prod-003',
        'Nike Air Zoom Pegasus 37',
        'PROD-003',
        'SKU-003',
        139.99,
        119.99,
        '<p>The Nike Air Zoom Pegasus 37 provides responsive cushioning for your run with a breathable upper.</p>',
        'sale',
        'low_stock',
        25,
        312,
        4.8,
        445,
        'Footwear',
        'Women'
    ),
    (
        'prod-004',
        'Nike Blazer Low 77 Vintage',
        'PROD-004',
        'SKU-004',
        99.99,
        NULL,
        '<p>The Nike Blazer Low 77 Vintage brings old-school basketball style to your everyday look.</p>',
        '',
        'in_stock',
        180,
        67,
        4.3,
        189,
        'Footwear',
        'Men'
    ),
    (
        'prod-005',
        'Nike ZoomX Vaporfly',
        'PROD-005',
        'SKU-005',
        249.99,
        NULL,
        '<p>Built for speed, the Nike ZoomX Vaporfly features cutting-edge technology for competitive runners.</p>',
        'new',
        'in_stock',
        75,
        123,
        4.9,
        567,
        'Footwear',
        'Unisex'
    );

-- Seed Product Images
INSERT INTO
    product_images (product_id, image_url, is_cover, sort_order)
VALUES
    (
        'prod-001',
        'https://api-dev-minimal-v4.vercel.app/assets/images/products/product_1.jpg',
        TRUE,
        0
    ),
    (
        'prod-001',
        'https://api-dev-minimal-v4.vercel.app/assets/images/products/product_2.jpg',
        FALSE,
        1
    ),
    (
        'prod-002',
        'https://api-dev-minimal-v4.vercel.app/assets/images/products/product_3.jpg',
        TRUE,
        0
    ),
    (
        'prod-003',
        'https://api-dev-minimal-v4.vercel.app/assets/images/products/product_4.jpg',
        TRUE,
        0
    ),
    (
        'prod-004',
        'https://api-dev-minimal-v4.vercel.app/assets/images/products/product_5.jpg',
        TRUE,
        0
    ),
    (
        'prod-005',
        'https://api-dev-minimal-v4.vercel.app/assets/images/products/product_6.jpg',
        TRUE,
        0
    );

-- Seed Product Tags
INSERT INTO
    product_tags (product_id, tag)
VALUES
    ('prod-001', 'Nike'),
    ('prod-001', 'Sneakers'),
    ('prod-001', 'Basketball'),
    ('prod-002', 'Nike'),
    ('prod-002', 'Sustainable'),
    ('prod-002', 'Eco-Friendly'),
    ('prod-003', 'Nike'),
    ('prod-003', 'Running'),
    ('prod-003', 'Pegasus'),
    ('prod-004', 'Nike'),
    ('prod-004', 'Vintage'),
    ('prod-004', 'Blazer'),
    ('prod-005', 'Nike'),
    ('prod-005', 'Running'),
    ('prod-005', 'Performance');

-- Seed Product Sizes
INSERT INTO
    product_sizes (product_id, size)
VALUES
    ('prod-001', '7'),
    ('prod-001', '8'),
    ('prod-001', '9'),
    ('prod-001', '10'),
    ('prod-001', '11'),
    ('prod-002', '6'),
    ('prod-002', '7'),
    ('prod-002', '8'),
    ('prod-002', '9'),
    ('prod-003', '6'),
    ('prod-003', '7'),
    ('prod-003', '8'),
    ('prod-003', '9'),
    ('prod-003', '10'),
    ('prod-004', '8'),
    ('prod-004', '9'),
    ('prod-004', '10'),
    ('prod-005', '7'),
    ('prod-005', '8'),
    ('prod-005', '9'),
    ('prod-005', '10'),
    ('prod-005', '11');

-- Seed Product Colors
INSERT INTO
    product_colors (product_id, color_name, color_hex)
VALUES
    ('prod-001', 'White', '#FFFFFF'),
    ('prod-001', 'Black', '#000000'),
    ('prod-002', 'Grey', '#808080'),
    ('prod-002', 'Blue', '#0066CC'),
    ('prod-003', 'Pink', '#FF69B4'),
    ('prod-003', 'Purple', '#800080'),
    ('prod-004', 'White', '#FFFFFF'),
    ('prod-004', 'Navy', '#000080'),
    ('prod-005', 'Black', '#000000'),
    ('prod-005', 'Red', '#FF0000');

-- ============================================
-- Seed Blog Posts
-- ============================================
INSERT INTO
    blog_posts (
        id,
        title,
        description,
        content,
        cover_url,
        author_id,
        views,
        comments_count,
        share_count
    )
VALUES
    (
        'blog-001',
        'Getting Started with React Hooks',
        'Learn the fundamentals of React Hooks and how they can simplify your component logic',
        '<h1>Introduction to React Hooks</h1><p>React Hooks revolutionized the way we write React components...</p>',
        'https://api-dev-minimal-v4.vercel.app/assets/images/covers/cover_1.jpg',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        1234,
        45,
        89
    ),
    (
        'blog-002',
        'Advanced TypeScript Patterns',
        'Explore advanced TypeScript patterns for building robust applications',
        '<h1>TypeScript Design Patterns</h1><p>TypeScript provides powerful type system features...</p>',
        'https://api-dev-minimal-v4.vercel.app/assets/images/covers/cover_2.jpg',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        987,
        23,
        56
    ),
    (
        'blog-003',
        'Building RESTful APIs with Node.js',
        'A comprehensive guide to creating scalable REST APIs',
        '<h1>RESTful API Development</h1><p>Building a RESTful API requires careful planning...</p>',
        'https://api-dev-minimal-v4.vercel.app/assets/images/covers/cover_3.jpg',
        'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
        2341,
        67,
        123
    ),
    (
        'blog-004',
        'Database Optimization Techniques',
        'Learn how to optimize your database queries for better performance',
        '<h1>Database Performance</h1><p>Database optimization is crucial for application speed...</p>',
        'https://api-dev-minimal-v4.vercel.app/assets/images/covers/cover_4.jpg',
        'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
        1567,
        34,
        78
    );

-- ============================================
-- Seed Chat Conversations
-- ============================================
INSERT INTO
    chat_conversations (id, type)
VALUES
    ('conv-001', 'ONE_TO_ONE'),
    ('conv-002', 'ONE_TO_ONE'),
    ('conv-003', 'GROUP');

-- Seed Chat Participants
INSERT INTO
    chat_participants (conversation_id, user_id, unread_count)
VALUES
    (
        'conv-001',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        0
    ),
    (
        'conv-001',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        2
    ),
    (
        'conv-002',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        1
    ),
    (
        'conv-002',
        'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
        0
    ),
    (
        'conv-003',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        0
    ),
    (
        'conv-003',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        0
    ),
    (
        'conv-003',
        'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
        1
    ),
    (
        'conv-003',
        'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
        0
    );

-- Seed Chat Messages
INSERT INTO
    chat_messages (
        id,
        conversation_id,
        sender_id,
        body,
        content_type,
        created_at
    )
VALUES
    (
        'msg-001',
        'conv-001',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'Hey! How are you doing?',
        'text',
        '2024-01-15 10:30:00'
    ),
    (
        'msg-002',
        'conv-001',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        'I am doing great! Thanks for asking.',
        'text',
        '2024-01-15 10:32:00'
    ),
    (
        'msg-003',
        'conv-001',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'Did you check the latest update?',
        'text',
        '2024-01-15 10:35:00'
    ),
    (
        'msg-004',
        'conv-002',
        'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
        'Meeting at 3 PM today',
        'text',
        '2024-01-15 11:00:00'
    ),
    (
        'msg-005',
        'conv-003',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'Welcome to the team chat!',
        'text',
        '2024-01-14 09:00:00'
    );

-- ============================================
-- Seed Calendar Events
-- ============================================
INSERT INTO
    calendar_events (
        id,
        user_id,
        title,
        description,
        start_time,
        end_time,
        all_day,
        color
    )
VALUES
    (
        'event-001',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        'Team Meeting',
        'Weekly team sync meeting',
        '2024-01-20 14:00:00',
        '2024-01-20 15:00:00',
        FALSE,
        '#00B8D9'
    ),
    (
        'event-002',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        'Project Deadline',
        'Final submission for project X',
        '2024-01-25 00:00:00',
        '2024-01-25 23:59:59',
        TRUE,
        '#FF5630'
    ),
    (
        'event-003',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'Design Review',
        'Review new design mockups',
        '2024-01-22 10:00:00',
        '2024-01-22 11:30:00',
        FALSE,
        '#36B37E'
    ),
    (
        'event-004',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        'Conference',
        'Annual tech conference',
        '2024-02-01 00:00:00',
        '2024-02-03 23:59:59',
        TRUE,
        '#FFC107'
    );

-- ============================================
-- Seed Kanban Columns
-- ============================================
INSERT INTO
    kanban_columns (id, name, sort_order)
VALUES
    ('col-001', 'To Do', 0),
    ('col-002', 'In Progress', 1),
    ('col-003', 'Review', 2),
    ('col-004', 'Done', 3);

-- Seed Kanban Cards
INSERT INTO
    kanban_cards (
        id,
        column_id,
        name,
        description,
        completed,
        due_start,
        due_end,
        sort_order
    )
VALUES
    (
        'card-001',
        'col-001',
        'Design new landing page',
        'Create mockups for the new landing page design',
        FALSE,
        '2024-01-20',
        '2024-01-25',
        0
    ),
    (
        'card-002',
        'col-001',
        'Update documentation',
        'Update API documentation with new endpoints',
        FALSE,
        '2024-01-22',
        '2024-01-28',
        1
    ),
    (
        'card-003',
        'col-002',
        'Implement authentication',
        'Add JWT-based authentication to API',
        FALSE,
        '2024-01-15',
        '2024-01-23',
        0
    ),
    (
        'card-004',
        'col-002',
        'Database migration',
        'Migrate from MongoDB to MySQL',
        FALSE,
        '2024-01-18',
        '2024-01-30',
        1
    ),
    (
        'card-005',
        'col-003',
        'Code review for PR #123',
        'Review and approve pull request',
        FALSE,
        '2024-01-19',
        '2024-01-20',
        0
    ),
    (
        'card-006',
        'col-004',
        'Setup CI/CD pipeline',
        'Configure GitHub Actions for deployment',
        TRUE,
        '2024-01-10',
        '2024-01-15',
        0
    );

-- Seed Kanban Card Assignees
INSERT INTO
    kanban_card_assignees (card_id, user_id)
VALUES
    (
        'card-001',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
    ),
    (
        'card-002',
        'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e'
    ),
    (
        'card-003',
        'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'
    ),
    (
        'card-004',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1'
    ),
    (
        'card-004',
        'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f'
    ),
    (
        'card-005',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1'
    ),
    (
        'card-006',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1'
    );

-- Seed Kanban Card Comments
INSERT INTO
    kanban_card_comments (id, card_id, user_id, message, message_type)
VALUES
    (
        'comment-001',
        'card-001',
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'Started working on the wireframes',
        'text'
    ),
    (
        'comment-002',
        'card-003',
        'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
        'JWT implementation is 50% complete',
        'text'
    ),
    (
        'comment-003',
        'card-004',
        'e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
        'Need to discuss schema design',
        'text'
    );

-- ============================================
-- Seed Mail Labels
-- ============================================
INSERT INTO
    mail_labels (id, name, unread_count, color)
VALUES
    ('label-inbox', 'Inbox', 5, '#00B8D9'),
    ('label-sent', 'Sent', 0, '#36B37E'),
    ('label-drafts', 'Drafts', 2, '#FFC107'),
    ('label-trash', 'Trash', 0, '#FF5630'),
    ('label-spam', 'Spam', 1, '#666666'),
    ('label-important', 'Important', 3, '#FF6B6B');

-- Seed Mails
INSERT INTO
    mails (
        id,
        from_email,
        from_name,
        from_avatar,
        to_email,
        subject,
        message,
        is_important,
        is_starred,
        is_unread
    )
VALUES
    (
        'mail-001',
        'john.doe@example.com',
        'John Doe',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_2.jpg',
        'demo@minimals.cc',
        'Project Update',
        '<p>Hi, here is the latest update on the project...</p>',
        FALSE,
        TRUE,
        TRUE
    ),
    (
        'mail-002',
        'jane.smith@example.com',
        'Jane Smith',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_3.jpg',
        'demo@minimals.cc',
        'Design Review',
        '<p>Please review the attached design files...</p>',
        TRUE,
        FALSE,
        TRUE
    ),
    (
        'mail-003',
        'mike.johnson@example.com',
        'Mike Johnson',
        'https://api-dev-minimal-v4.vercel.app/assets/images/avatar/avatar_4.jpg',
        'demo@minimals.cc',
        'Meeting Tomorrow',
        '<p>Reminder: We have a meeting scheduled for tomorrow at 10 AM...</p>',
        TRUE,
        TRUE,
        FALSE
    ),
    (
        'mail-004',
        'notifications@github.com',
        'GitHub',
        NULL,
        'demo@minimals.cc',
        'New PR Created',
        '<p>A new pull request has been created in your repository...</p>',
        FALSE,
        FALSE,
        TRUE
    );

-- Seed Mail Label Mappings
INSERT INTO
    mail_label_mappings (mail_id, label_id)
VALUES
    ('mail-001', 'label-inbox'),
    ('mail-002', 'label-inbox'),
    ('mail-002', 'label-important'),
    ('mail-003', 'label-inbox'),
    ('mail-003', 'label-important'),
    ('mail-004', 'label-inbox');

-- ============================================
-- End of Seed Data
-- ============================================