flatpickr("#calendar", {

inline: true,
locale: "zh",
defaultDate: "today",
minDate: "today",

onChange: function(selectedDates, dateStr) {

console.log("選擇日期:", dateStr)

}

})

/* 時間選擇 */
document.querySelectorAll(".timeItem").forEach(el => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".timeItem").forEach(t => t.classList.remove("active"))
    el.classList.add("active")
  })
})
