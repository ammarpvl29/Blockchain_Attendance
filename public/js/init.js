document.addEventListener('DOMContentLoaded', function() {
    // Initialize all Materialize components
    M.AutoInit();
    
    // Initialize datepicker with specific options
    const dateElems = document.querySelectorAll('.datepicker');
    M.Datepicker.init(dateElems, {
        format: 'yyyy-mm-dd',
        defaultDate: new Date(),
        setDefaultDate: true
    });
    
    // Initialize select
    const selectElems = document.querySelectorAll('select');
    M.FormSelect.init(selectElems);
});