/* =========================================================
   BOOKLY
   FRONTEND APPLICATION
   ========================================================= */

const $ = selector =>
    document.querySelector(selector);


const $$ = selector =>
    document.querySelectorAll(selector);


/* =========================================================
   STATE
   ========================================================= */

const S = {

    token:
        localStorage.getItem('bookly_token'),

    user: null,

    books: [],

    active: null,

    authMode: 'login'

};


/* =========================================================
   PDF READER STATE
   ========================================================= */

let PDF_DOCUMENT = null;

let PDF_PAGE = 1;

let PDF_SCALE = 1;

let PDF_LOADING = false;


/* =========================================================
   PDF.JS
   ========================================================= */

if (window.pdfjsLib) {

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

}


/* =========================================================
   API
   ========================================================= */

async function api(
    url,
    options = {}
) {

    const headers =
        options.headers || {};


    if (
        S.token &&
        !headers.Authorization
    ) {

        headers.Authorization =
            `Bearer ${S.token}`;

    }


    options.headers = headers;


    const response =
        await fetch(
            url,
            options
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        throw new Error(
            data?.error ||
            data?.message ||
            `Request failed (${response.status})`
        );

    }


    return data;

}


/* =========================================================
   TOAST
   ========================================================= */

function toast(
    message,
    type = 'success'
) {

    const container =
        $('#toast-container');


    const element =
        document.createElement('div');


    element.className =
        `toast ${type}`;


    element.textContent =
        message;


    container.appendChild(
        element
    );


    setTimeout(
        () => {

            element.style.opacity = '0';

            element.style.transform =
                'translateX(20px)';

            setTimeout(
                () => element.remove(),
                250
            );

        },
        2800
    );

}


/* =========================================================
   AUTH
   ========================================================= */

function setAuthMode(
    mode
) {

    S.authMode = mode;


    const login =
        mode === 'login';


    $('#login-tab')
        .classList.toggle(
            'active',
            login
        );


    $('#register-tab')
        .classList.toggle(
            'active',
            !login
        );


    $('#auth-title')
        .textContent =
        login
            ? 'Welcome back'
            : 'Create your account';


    $('#auth-description')
        .textContent =
        login
            ? 'Sign in to continue to your library.'
            : 'Create an account to interact with books.';


    $('#auth-submit')
        .textContent =
        login
            ? 'Sign In'
            : 'Create Account';


    /*
       Important:
       Switching Login/Register resets
       username and password.
    */

    $('#username').value = '';

    $('#password').value = '';

}


async function handleAuth(
    event
) {

    event.preventDefault();


    const username =
        $('#username')
            .value
            .trim();


    const password =
        $('#password')
            .value;


    if (!username || !password) {

        toast(
            'Username dan password wajib diisi.',
            'error'
        );

        return;

    }


    const endpoint =
        S.authMode === 'login'
            ? '/api/auth/login'
            : '/api/auth/register';


    const button =
        $('#auth-submit');


    button.disabled = true;

    button.textContent =
        S.authMode === 'login'
            ? 'Signing in...'
            : 'Creating...';


    try {

        const data =
            await api(
                endpoint,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            username,
                            password
                        })
                }
            );


        if (data.token) {

            S.token =
                data.token;

            localStorage.setItem(
                'bookly_token',
                S.token
            );

        }


        await initializeApp();


        toast(
            S.authMode === 'login'
                ? 'Welcome back.'
                : 'Account created successfully.'
        );


    } catch (error) {

        toast(
            error.message,
            'error'
        );


    } finally {

        button.disabled = false;

        button.textContent =
            S.authMode === 'login'
                ? 'Sign In'
                : 'Create Account';

    }

}


async function loginAsGuest() {

    S.token = null;

    S.user = null;

    localStorage.removeItem(
        'bookly_token'
    );


    showApp();


    await loadBooks();

    updateUserUI();

    navigate('home');

}


async function logout() {

    S.token = null;

    S.user = null;

    localStorage.removeItem(
        'bookly_token'
    );


    $('#app')
        .classList.add('hidden');


    $('#auth-page')
        .classList.remove('hidden');


    setAuthMode('login');

}


/* =========================================================
   USER
   ========================================================= */

async function loadUser() {

    if (!S.token) {

        S.user = null;

        return;

    }


    try {

        const data =
            await api(
                '/api/auth/me'
            );


        S.user =
            data.user || data;


    } catch {

        S.token = null;

        S.user = null;

        localStorage.removeItem(
            'bookly_token'
        );

    }

}


function updateUserUI() {

    const guest =
        !S.user;


    $('#user-name')
        .textContent =
        guest
            ? 'Guest'
            : S.user.username;


    $('#user-role')
        .textContent =
        guest
            ? 'Guest'
            : (
                S.user.role === 'admin'
                    ? 'Administrator'
                    : 'Member'
            );


    $('#user-avatar')
        .textContent =
        guest
            ? 'G'
            : S.user.username
                .charAt(0)
                .toUpperCase();


    $('#logout-button')
        .style.display =
        guest
            ? 'none'
            : 'block';


    $('#dashboard-nav')
        .style.display =
        guest
            ? 'none'
            : 'block';


    $('#admin-nav')
        .style.display =
        S.user?.role === 'admin'
            ? 'block'
            : 'none';


    $$('.mobile-nav [data-view="dashboard"]')
        .forEach(
            element => {

                element.style.display =
                    guest
                        ? 'none'
                        : 'block';

            }
        );


    $$('.mobile-nav [data-view="admin"]')
        .forEach(
            element => {

                element.style.display =
                    S.user?.role === 'admin'
                        ? 'block'
                        : 'none';

            }
        );

}


/* =========================================================
   APP INIT
   ========================================================= */

async function initializeApp() {

    await loadUser();

    showApp();

    updateUserUI();

    await loadBooks();

    navigate('home');

}


function showApp() {

    $('#auth-page')
        .classList.add('hidden');


    $('#app')
        .classList.remove('hidden');

}


/* =========================================================
   BOOKS
   ========================================================= */

async function loadBooks() {

    try {

        const data =
            await api(
                '/api/books'
            );


        S.books =
            Array.isArray(data)
                ? data
                : (
                    data.books ||
                    []
                );


        renderHomeBooks();

        renderBooks();

        renderAdminBooks();


    } catch (error) {

        console.error(error);

        toast(
            'Failed to load books.',
            'error'
        );

    }

}


function filteredBooks() {

    const query =
        $('#book-search')
            ?.value
            ?.trim()
            .toLowerCase() ||
        '';


    if (!query) {

        return S.books;

    }


    return S.books.filter(
        book =>
            String(book.title)
                .toLowerCase()
                .includes(query)
    );

}


/* =========================================================
   BOOK CARD
   ========================================================= */

function bookCard(
    book
) {

    const rating =
        Number(
            book.average_rating || 0
        ).toFixed(1);


    const article =
        document.createElement('article');


    article.className =
        'book-card';


    article.innerHTML = `

        <div class="book-cover">

            <div class="book-cover-text">

                <div class="cover-symbol">
                    ${escapeHTML(
        String(book.title)
            .charAt(0)
            .toUpperCase()
    )}
                </div>

                <strong>
                    ${escapeHTML(
        book.title
    )}
                </strong>

                <small>
                    BOOKLY LIBRARY
                </small>

            </div>

        </div>


        <div class="book-card-body">

            <h3>
                ${escapeHTML(
        book.title
    )}
            </h3>


            <div class="book-card-meta">

                <span>
                    ${book.up_votes || 0} likes
                </span>

                <span class="rating">
                    ★ ${rating}
                </span>

            </div>

        </div>
    `;


    article.addEventListener(
        'click',
        () => openBook(book.id)
    );


    return article;

}


function renderHomeBooks() {

    const container =
        $('#home-books');


    container.innerHTML = '';


    S.books
        .slice(0, 5)
        .forEach(
            book =>
                container.appendChild(
                    bookCard(book)
                )
        );


    if (!S.books.length) {

        container.innerHTML =
            emptyState(
                'No books yet',
                'Your library is currently empty.'
            );

    }

}


function renderBooks() {

    const container =
        $('#books-grid');


    container.innerHTML = '';


    filteredBooks()
        .forEach(
            book =>
                container.appendChild(
                    bookCard(book)
                )
        );


    if (!filteredBooks().length) {

        container.innerHTML =
            emptyState(
                'No books found',
                'Try another search.'
            );

    }

}


function emptyState(
    title,
    text
) {

    return `

        <div
            style="
                grid-column:1/-1;
                padding:50px;
                text-align:center;
                color:var(--muted);
            "
        >

            <strong
                style="
                    display:block;
                    color:var(--text);
                    font-size:14px;
                    margin-bottom:6px;
                "
            >
                ${escapeHTML(title)}
            </strong>

            <span
                style="font-size:9px;"
            >
                ${escapeHTML(text)}
            </span>

        </div>
    `;

}


/* =========================================================
   OPEN BOOK
   ========================================================= */

async function openBook(
    id
) {

    const book =
        S.books.find(
            item => item.id === id
        );


    if (!book) return;


    S.active = id;


    $('#modal-title')
        .textContent =
        book.title;


    $('#reader-title')
        .textContent =
        book.title;


    $('#reader-status')
        .textContent =
        'Opening book...';


    $('#up-count')
        .textContent =
        book.up_votes || 0;


    $('#down-count')
        .textContent =
        book.down_votes || 0;


    $('#avg')
        .textContent =
        Number(
            book.average_rating || 0
        ).toFixed(1);


    $('#modal-download')
        .href =
        `/api/books/${id}/download`;


    $('#up-btn')
        .disabled =
        !S.user;


    $('#down-btn')
        .disabled =
        !S.user;


    $('#up-btn')
        .classList.toggle(
            'active',
            book.user_vote === 1
        );


    $('#down-btn')
        .classList.toggle(
            'active',
            book.user_vote === -1
        );


    $('#rating-label')
        .textContent =
        S.user
            ? (
                book.user_rating
                    ? `Kamu memberi ${book.user_rating}/5`
                    : 'Pilih 1–5 bintang'
            )
            : 'Login untuk memberi rating';


    paintStars(
        book.user_rating || 0
    );


    $('#book-modal')
        .classList.remove('hidden');


    document.body.style.overflow =
        'hidden';


    $('#reader-loading')
        .classList.remove('hidden');


    PDF_DOCUMENT = null;

    PDF_PAGE = 1;

    PDF_SCALE = 1;

    PDF_LOADING = false;


    updateReaderZoom();


    try {

        const loadingTask =
            pdfjsLib.getDocument(
                `/api/books/${id}/view`
            );


        PDF_DOCUMENT =
            await loadingTask.promise;


        $('#reader-total')
            .textContent =
            PDF_DOCUMENT.numPages;


        $('#reader-status')
            .textContent =
            `${PDF_DOCUMENT.numPages} pages`;


        await renderBookSpread();


    } catch (error) {

        console.error(error);

        $('#reader-status')
            .textContent =
            'Failed to open book';


        toast(
            'PDF tidak dapat dibuka.',
            'error'
        );

    }


    $('#reader-loading')
        .classList.add('hidden');


    await loadComments(id);

}


/* =========================================================
   CUSTOM BOOK READER
   ========================================================= */

async function renderBookSpread() {

    if (!PDF_DOCUMENT)
        return;


    const mobile =
        window.innerWidth <= 620;


    const leftPage =
        mobile
            ? null
            : PDF_PAGE;


    const rightPage =
        mobile
            ? PDF_PAGE
            : PDF_PAGE + 1;


    await renderSinglePage(
        leftPage,
        $('#page-left'),
        $('#page-number-left'),
        $('.left-page')
    );


    await renderSinglePage(
        rightPage,
        $('#page-right'),
        $('#page-number-right'),
        $('.right-page')
    );


    $('#reader-current')
        .textContent =
        PDF_PAGE;


    $('#reader-total')
        .textContent =
        PDF_DOCUMENT.numPages;


    updateReaderButtons();

}


async function renderSinglePage(
    pageNumber,
    canvas,
    numberElement,
    pageElement
) {

    if (!pageNumber) {

        pageElement
            .classList
            .add('empty-page');


        canvas.width = 1;

        canvas.height = 1;

        numberElement.textContent = '';

        return;

    }


    pageElement
        .classList
        .remove('empty-page');


    const page =
        await PDF_DOCUMENT.getPage(
            pageNumber
        );


    const container =
        pageElement.querySelector(
            '.page-inner'
        );


    const width =
        container.clientWidth - 18;


    const height =
        container.clientHeight - 18;


    const baseViewport =
        page.getViewport({
            scale: 1
        });


    const widthScale =
        width /
        baseViewport.width;


    const heightScale =
        height /
        baseViewport.height;


    let scale =
        Math.min(
            widthScale,
            heightScale
        );


    scale *= PDF_SCALE;


    const viewport =
        page.getViewport({
            scale
        });


    const context =
        canvas.getContext(
            '2d'
        );


    const ratio =
        window.devicePixelRatio || 1;


    canvas.width =
        Math.floor(
            viewport.width * ratio
        );


    canvas.height =
        Math.floor(
            viewport.height * ratio
        );


    canvas.style.width =
        `${viewport.width}px`;


    canvas.style.height =
        `${viewport.height}px`;


    context.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    await page.render({

        canvasContext:
            context,

        viewport

    }).promise;


    numberElement.textContent =
        pageNumber;

}


/* =========================================================
   NEXT PAGE
   ========================================================= */

async function nextBookPage() {

    if (
        !PDF_DOCUMENT ||
        PDF_LOADING
    ) return;


    const mobile =
        window.innerWidth <= 620;


    const step =
        mobile ? 1 : 2;


    if (
        PDF_PAGE + step >
        PDF_DOCUMENT.numPages
    ) return;


    PDF_LOADING = true;


    const book =
        $('#book-open');


    book.classList.remove(
        'turn-prev'
    );


    void book.offsetWidth;


    book.classList.add(
        'turn-next'
    );


    PDF_PAGE += step;


    setTimeout(
        async () => {

            try {

                await renderBookSpread();

            } finally {

                PDF_LOADING = false;

            }

        },
        130
    );

}


/* =========================================================
   PREVIOUS PAGE
   ========================================================= */

async function previousBookPage() {

    if (
        !PDF_DOCUMENT ||
        PDF_LOADING
    ) return;


    const mobile =
        window.innerWidth <= 620;


    const step =
        mobile ? 1 : 2;


    if (PDF_PAGE <= 1)
        return;


    PDF_LOADING = true;


    const book =
        $('#book-open');


    book.classList.remove(
        'turn-next'
    );


    void book.offsetWidth;


    book.classList.add(
        'turn-prev'
    );


    PDF_PAGE =
        Math.max(
            1,
            PDF_PAGE - step
        );


    setTimeout(
        async () => {

            try {

                await renderBookSpread();

            } finally {

                PDF_LOADING = false;

            }

        },
        130
    );

}


/* =========================================================
   ZOOM
   ========================================================= */

async function zoomBook(
    amount
) {

    if (!PDF_DOCUMENT)
        return;


    PDF_SCALE += amount;


    PDF_SCALE =
        Math.max(
            .65,
            Math.min(
                1.8,
                PDF_SCALE
            )
        );


    updateReaderZoom();


    await renderBookSpread();

}


function updateReaderZoom() {

    $('#reader-zoom')
        .textContent =
        `${Math.round(
            PDF_SCALE * 100
        )}%`;

}


/* =========================================================
   READER BUTTONS
   ========================================================= */

function updateReaderButtons() {

    if (!PDF_DOCUMENT)
        return;


    const mobile =
        window.innerWidth <= 620;


    const step =
        mobile ? 1 : 2;


    const atBeginning =
        PDF_PAGE <= 1;


    const atEnd =
        PDF_PAGE + step >
        PDF_DOCUMENT.numPages;


    $('#reader-prev')
        .disabled =
        atBeginning;


    $('#page-arrow-left')
        .disabled =
        atBeginning;


    $('#reader-next')
        .disabled =
        atEnd;


    $('#page-arrow-right')
        .disabled =
        atEnd;

}


/* =========================================================
   CLOSE BOOK
   ========================================================= */

function closeBook() {

    PDF_DOCUMENT = null;

    PDF_PAGE = 1;

    PDF_SCALE = 1;

    PDF_LOADING = false;


    S.active = null;


    $('#book-modal')
        .classList.add('hidden');


    document.body.style.overflow =
        '';


    const canvases = [
        $('#page-left'),
        $('#page-right')
    ];


    canvases.forEach(
        canvas => {

            if (!canvas) return;


            const context =
                canvas.getContext(
                    '2d'
                );


            context.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

        }
    );

}


/* =========================================================
   COMMENTS
   ========================================================= */

async function loadComments(
    bookId
) {

    const container =
        $('#comments-list');


    container.innerHTML =
        '<div style="color:#718096;font-size:8px;">Loading comments...</div>';


    try {

        const data =
            await api(
                `/api/books/${bookId}/comments`
            );


        const comments =
            Array.isArray(data)
                ? data
                : (
                    data.comments ||
                    []
                );


        container.innerHTML = '';


        if (!comments.length) {

            container.innerHTML =
                `
                    <div
                        style="
                            color:#718096;
                            font-size:8px;
                            padding:12px 0;
                        "
                    >
                        Belum ada komentar.
                    </div>
                `;

            return;

        }


        comments.forEach(
            comment => {

                const element =
                    document.createElement(
                        'div'
                    );


                element.className =
                    'comment';


                const own =
                    S.user &&
                    (
                        comment.user_id ===
                        S.user.id
                    );


                element.innerHTML = `

                    <div class="comment-header">

                        <span class="comment-author">
                            ${escapeHTML(
                    comment.username ||
                    'User'
                )}
                        </span>

                        <span class="comment-date">
                            ${formatDate(
                    comment.created_at
                )}
                        </span>

                    </div>


                    <div class="comment-text">
                        ${escapeHTML(
                    comment.comment ||
                    comment.content ||
                    ''
                )}
                    </div>


                    ${own
                        ? `
                                <button
                                    class="comment-delete"
                                    data-comment-id="${comment.id}"
                                    type="button"
                                >
                                    Delete comment
                                </button>
                            `
                        : ''
                    }

                `;


                const deleteButton =
                    element.querySelector(
                        '.comment-delete'
                    );


                if (deleteButton) {

                    deleteButton.onclick =
                        async () => {

                            try {

                                await api(
                                    `/api/comments/${comment.id}`,
                                    {
                                        method:
                                            'DELETE'
                                    }
                                );


                                await loadComments(
                                    bookId
                                );


                                toast(
                                    'Comment deleted.'
                                );


                            } catch (error) {

                                toast(
                                    error.message,
                                    'error'
                                );

                            }

                        };

                }


                container.appendChild(
                    element
                );

            }
        );


    } catch (error) {

        container.innerHTML =
            `
                <div
                    style="
                        color:#ef7673;
                        font-size:8px;
                    "
                >
                    Failed to load comments.
                </div>
            `;

    }

}


async function submitComment(
    event
) {

    event.preventDefault();


    if (!S.user) {

        toast(
            'Login required to comment.',
            'error'
        );

        return;

    }


    const input =
        $('#comment-input');


    const content =
        input.value.trim();


    if (!content)
        return;


    const button =
        $('#comment-submit');


    button.disabled = true;


    try {

        await api(
            `/api/books/${S.active}/comments`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        comment:
                            content
                    })
            }
        );


        input.value = '';


        await loadComments(
            S.active
        );


        toast(
            'Comment posted.'
        );


    } catch (error) {

        toast(
            error.message,
            'error'
        );


    } finally {

        button.disabled = false;

    }

}


/* =========================================================
   VOTES
   ========================================================= */

async function vote(
    value
) {

    if (!S.user) {

        toast(
            'Login required to vote.',
            'error'
        );

        return;

    }


    if (!S.active)
        return;


    try {

        await api(
            `/api/books/${S.active}/vote`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        vote: value
                    })
            }
        );


        await loadBooks();


        const book =
            S.books.find(
                item =>
                    item.id === S.active
            );


        if (book) {

            $('#up-count')
                .textContent =
                book.up_votes || 0;


            $('#down-count')
                .textContent =
                book.down_votes || 0;


            $('#up-btn')
                .classList.toggle(
                    'active',
                    book.user_vote === 1
                );


            $('#down-btn')
                .classList.toggle(
                    'active',
                    book.user_vote === -1
                );

        }


        toast(
            'Vote updated.'
        );


    } catch (error) {

        toast(
            error.message,
            'error'
        );

    }

}


/* =========================================================
   RATING
   ========================================================= */

function paintStars(
    rating
) {

    $$('#stars button')
        .forEach(
            button => {

                const value =
                    Number(
                        button.dataset.rating
                    );


                button.classList.toggle(
                    'active',
                    value <= rating
                );

            }
        );

}


async function rateBook(
    rating
) {

    if (!S.user) {

        toast(
            'Login required to rate.',
            'error'
        );

        return;

    }


    try {

        await api(
            `/api/books/${S.active}/rating`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        rating
                    })
            }
        );


        paintStars(rating);


        $('#rating-label')
            .textContent =
            `Kamu memberi ${rating}/5`;


        await loadBooks();


        const book =
            S.books.find(
                item =>
                    item.id === S.active
            );


        if (book) {

            $('#avg')
                .textContent =
                Number(
                    book.average_rating || 0
                ).toFixed(1);

        }


        toast(
            'Rating saved.'
        );


    } catch (error) {

        toast(
            error.message,
            'error'
        );

    }

}


/* =========================================================
   ADMIN
   ========================================================= */

function renderAdminBooks() {

    const container =
        $('#admin-book-list');


    const count =
        $('#admin-book-count');


    if (!container)
        return;


    count.textContent =
        S.books.length;


    container.innerHTML = '';


    if (!S.books.length) {

        container.innerHTML =
            `
                <div
                    style="
                        color:var(--muted);
                        font-size:9px;
                        padding:15px 0;
                    "
                >
                    No books yet.
                </div>
            `;

        return;

    }


    S.books.forEach(
        book => {

            const item =
                document.createElement(
                    'div'
                );


            item.className =
                'admin-book-item';


            item.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                book.title
            )}
                    </strong>

                    <small>
                        ${escapeHTML(
                book.original_filename ||
                'PDF'
            )}
                    </small>

                </div>


                <div class="admin-book-actions">

                    <button
                        class="small-button edit-book"
                        type="button"
                    >
                        Edit
                    </button>

                    <button
                        class="small-button danger delete-book"
                        type="button"
                    >
                        Delete
                    </button>

                </div>

            `;


            item.querySelector(
                '.edit-book'
            ).onclick =
                () => editBook(book);


            item.querySelector(
                '.delete-book'
            ).onclick =
                () => deleteBook(book);


            container.appendChild(
                item
            );

        }
    );

}


function editBook(
    book
) {

    $('#book-id')
        .value =
        book.id;


    $('#book-title')
        .value =
        book.title;


    $('#book-file')
        .value =
        '';


    $('#admin-form-title')
        .textContent =
        'Edit book';


    $('#cancel-edit')
        .classList
        .remove('hidden');


    $('#view-admin')
        .scrollIntoView({
            behavior: 'smooth'
        });

}


function resetBookForm() {

    $('#book-form')
        .reset();


    $('#book-id')
        .value =
        '';


    $('#admin-form-title')
        .textContent =
        'Add new book';


    $('#cancel-edit')
        .classList
        .add('hidden');

}


async function submitBook(
    event
) {

    event.preventDefault();


    if (
        !S.user ||
        S.user.role !== 'admin'
    ) {

        toast(
            'Admin access required.',
            'error'
        );

        return;

    }


    const id =
        $('#book-id').value;


    const title =
        $('#book-title')
            .value
            .trim();


    const file =
        $('#book-file')
            .files[0];


    if (!title) {

        toast(
            'Book title is required.',
            'error'
        );

        return;

    }


    if (!id && !file) {

        toast(
            'Please select a PDF.',
            'error'
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        'title',
        title
    );


    if (file) {

        formData.append(
            'pdf',
            file
        );

    }


    const endpoint =
        id
            ? `/api/books/${id}`
            : '/api/books';


    try {

        await api(
            endpoint,
            {
                method:
                    id
                        ? 'PUT'
                        : 'POST',

                body:
                    formData
            }
        );


        resetBookForm();


        await loadBooks();


        toast(
            id
                ? 'Book updated.'
                : 'Book added.'
        );


    } catch (error) {

        toast(
            error.message,
            'error'
        );

    }

}


async function deleteBook(
    book
) {

    const confirmed =
        confirm(
            `Delete "${book.title}"?`
        );


    if (!confirmed)
        return;


    try {

        await api(
            `/api/books/${book.id}`,
            {
                method: 'DELETE'
            }
        );


        await loadBooks();


        toast(
            'Book deleted.'
        );


    } catch (error) {

        toast(
            error.message,
            'error'
        );

    }

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function renderDashboard() {

    if (!S.user)
        return;


    try {

        const data =
            await api(
                '/api/dashboard'
            );


        const stats =
            data.stats ||
            data ||
            {};


        $('#dashboard-stats')
            .innerHTML = `

                <div class="stat-card">

                    <span>
                        Books
                    </span>

                    <strong>
                        ${stats.book_count ??
            S.books.length
            }
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        Comments
                    </span>

                    <strong>
                        ${stats.comment_count ??
            0
            }
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        Votes
                    </span>

                    <strong>
                        ${stats.vote_count ??
            0
            }
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        Ratings
                    </span>

                    <strong>
                        ${stats.rating_count ??
            0
            }
                    </strong>

                </div>

            `;


    } catch {

        $('#dashboard-stats')
            .innerHTML = `

                <div class="stat-card">

                    <span>
                        Books
                    </span>

                    <strong>
                        ${S.books.length}
                    </strong>

                </div>

            `;

    }


    $('#dashboard-books')
        .innerHTML = '';


    S.books
        .slice(0, 8)
        .forEach(
            book => {

                const element =
                    document.createElement(
                        'div'
                    );


                element.className =
                    'mini-book';


                element.innerHTML = `

                    <div>

                        <strong>
                            ${escapeHTML(
                    book.title
                )}
                        </strong>

                        <small>
                            ★ ${Number(
                    book.average_rating || 0
                ).toFixed(1)
                    }
                        </small>

                    </div>

                    <span>
                        →
                    </span>

                `;


                element.onclick =
                    () => openBook(book.id);


                $('#dashboard-books')
                    .appendChild(
                        element
                    );

            }
        );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function navigate(
    view
) {

    if (
        view === 'dashboard' &&
        !S.user
    ) {

        toast(
            'Login required.',
            'error'
        );

        return;

    }


    if (
        view === 'admin' &&
        S.user?.role !== 'admin'
    ) {

        toast(
            'Admin access required.',
            'error'
        );

        return;

    }


    $$('.page-view')
        .forEach(
            section => {

                section.classList.remove(
                    'active-view'
                );

            }
        );


    const target =
        $(`#view-${view}`);


    if (target) {

        target.classList.add(
            'active-view'
        );

    }


    $$('.nav-button')
        .forEach(
            button => {

                button.classList.toggle(
                    'active',
                    button.dataset.view === view
                );

            }
        );


    $('#mobile-nav')
        ?.classList.remove(
            'open'
        );


    if (view === 'dashboard') {

        renderDashboard();

    }


    if (view === 'books') {

        renderBooks();

    }


    if (view === 'admin') {

        renderAdminBooks();

    }


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

}


/* =========================================================
   THEME
   ========================================================= */

function loadTheme() {

    const theme =
        localStorage.getItem(
            'bookly_theme'
        );


    if (theme === 'dark') {

        document.body.classList.add(
            'dark'
        );

        $('#theme-toggle')
            .textContent =
            '☀';

    } else {

        document.body.classList.remove(
            'dark'
        );

        $('#theme-toggle')
            .textContent =
            '☾';

    }

}


function toggleTheme() {

    document.body.classList.toggle(
        'dark'
    );


    const dark =
        document.body.classList.contains(
            'dark'
        );


    localStorage.setItem(
        'bookly_theme',
        dark ? 'dark' : 'light'
    );


    $('#theme-toggle')
        .textContent =
        dark
            ? '☀'
            : '☾';

}


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(
    value
) {

    return String(value ?? '')
        .replace(
            /[&<>"']/g,
            character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[character])
        );

}


function formatDate(
    value
) {

    if (!value)
        return '';


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return '';

    }


    return date.toLocaleDateString(
        'id-ID',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }
    );

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function boot() {

    loadTheme();


    /* AUTH */

    $('#login-tab')
        .onclick =
        () => setAuthMode(
            'login'
        );


    $('#register-tab')
        .onclick =
        () => setAuthMode(
            'register'
        );


    $('#auth-form')
        .addEventListener(
            'submit',
            handleAuth
        );


    $('#guest-button')
        .onclick =
        loginAsGuest;


    $('#logout-button')
        .onclick =
        logout;


    /* NAV */

    $$('[data-view]')
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        navigate(
                            button.dataset.view
                        );

                    }
                );

            }
        );


    $('#mobile-menu')
        .onclick =
        () => {

            $('#mobile-nav')
                .classList
                .toggle('open');

        };


    /* THEME */

    $('#theme-toggle')
        .onclick =
        toggleTheme;


    /* SEARCH */

    $('#book-search')
        .addEventListener(
            'input',
            renderBooks
        );


    /* MODAL */

    $('#modal-close')
        .onclick =
        closeBook;


    /* VOTES */

    $('#up-btn')
        .onclick =
        () => vote(1);


    $('#down-btn')
        .onclick =
        () => vote(-1);


    /* RATINGS */

    $$('#stars button')
        .forEach(
            button => {

                button.onclick =
                    () => rateBook(
                        Number(
                            button.dataset.rating
                        )
                    );

            }
        );


    /* COMMENTS */

    $('#comment-form')
        .addEventListener(
            'submit',
            submitComment
        );


    /* ADMIN */

    $('#book-form')
        .addEventListener(
            'submit',
            submitBook
        );


    $('#cancel-edit')
        .onclick =
        resetBookForm;


    /* READER */

    $('#reader-prev')
        .onclick =
        previousBookPage;


    $('#reader-next')
        .onclick =
        nextBookPage;


    $('#page-arrow-left')
        .onclick =
        previousBookPage;


    $('#page-arrow-right')
        .onclick =
        nextBookPage;


    $('#reader-zoom-out')
        .onclick =
        () => zoomBook(-.1);


    $('#reader-zoom-in')
        .onclick =
        () => zoomBook(.1);


    $('#reader-fullscreen')
        .onclick =
        async () => {

            const reader =
                $('#book-reader');


            try {

                if (
                    !document.fullscreenElement
                ) {

                    await reader.requestFullscreen();

                } else {

                    await document.exitFullscreen();

                }

            } catch (error) {

                console.error(error);

            }

        };


    /* KEYBOARD */

    window.addEventListener(
        'keydown',
        event => {

            if (
                $('#book-modal')
                    .classList
                    .contains('hidden')
            ) {

                return;

            }


            if (
                event.key === 'Escape'
            ) {

                closeBook();

                return;

            }


            if (
                event.key === 'ArrowRight'
            ) {

                event.preventDefault();

                nextBookPage();

                return;

            }


            if (
                event.key === 'ArrowLeft'
            ) {

                event.preventDefault();

                previousBookPage();

                return;

            }


            if (
                event.key === '+' ||
                event.key === '='
            ) {

                event.preventDefault();

                zoomBook(.1);

                return;

            }


            if (
                event.key === '-'
            ) {

                event.preventDefault();

                zoomBook(-.1);

            }

        }
    );


    /* RESIZE */

    let resizeTimer;


    window.addEventListener(
        'resize',
        () => {

            clearTimeout(
                resizeTimer
            );


            resizeTimer =
                setTimeout(
                    () => {

                        if (
                            PDF_DOCUMENT
                        ) {

                            renderBookSpread();

                        }

                    },
                    250
                );

        }
    );


    /* CLOSE MODAL WHEN CLICKING BACKDROP */

    $('#book-modal')
        .addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    $('#book-modal')
                ) {

                    closeBook();

                }

            }
        );


    /* START */

    initializeApp();

}


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    boot
);