import Component from '../share/Component'
import $ from 'licia/$'
import h from 'licia/h'
import { measuredScrollbarWidth, hasVerticalScrollbar } from '../share/util'

export default class Menu extends Component {
  private menuItems: IMenuItemOptions[] = []
  private subMenu?: Menu
  private highlighted: $.$ | null = null
  constructor() {
    super(h('div'), { compName: 'menu' })

    this.bindEvent()
  }
  append(options: IMenuItemOptions) {
    this.menuItems.push(options)
  }
  show(x: number, y: number, parent?: Menu) {
    this.hide()
    const { $container, menuItems } = this
    $container.html('')

    for (let i = 0, len = menuItems.length; i < len; i++) {
      this.$container.append(this.createMenuItem(menuItems[i]))
    }

    const $glassPane = this.createGlassPane()
    $glassPane.append(this.container)

    this.positionContent(x, y, parent)
  }
  destroy() {
    this.hide()
    super.destroy()
  }
  hide = () => {
    this.$container.remove()
    this.hideSubMenu()
  }
  hideAll = () => {
    $(this.c('.grass-pane')).html('').remove()
  }
  private positionContent(x: number, y: number, parent?: Menu) {
    const { $container } = this
    const winWidth = window.innerWidth
    const winHeight = window.innerHeight
    const scrollbarSize = measuredScrollbarWidth()

    let width = winWidth
    let height = winHeight
    let parentWidth = 0
    if (parent) {
      parentWidth = parent.$container.offset().width
    }

    const offset = $container.offset()
    const widthOverflow = height < offset.height ? scrollbarSize : 0
    const heightOverflow = width < offset.width ? scrollbarSize : 0
    width = Math.min(width, offset.width + widthOverflow)
    height = Math.min(height, offset.height + heightOverflow)

    let left = x
    let top = y
    const right = winWidth - x
    const bottom = winHeight - y
    if (right < width && x - parentWidth > right) {
      left = x - width - parentWidth
    }
    if (bottom < height) {
      if (y > height) {
        top = y - height
        if (parent) {
          top += 30
        }
      } else {
        top -= height - bottom
      }
    }

    $container.css({
      width,
      height,
      left,
      top,
    })
  }
  private showSubMenu(subMenu: Menu, $el: $.$) {
    const { left, width, top } = $el.offset()

    let x = left + width
    if (hasVerticalScrollbar(this.container)) {
      x += measuredScrollbarWidth()
    }
    subMenu.show(x, top - 5, this)
    this.subMenu = subMenu
  }
  private hideSubMenu() {
    if (this.subMenu) {
      this.subMenu.hide()
      delete this.subMenu
    }
  }
  private createGlassPane() {
    const $grassPane = $(this.c('.grass-pane'))
    if (($grassPane as any).length > 0) {
      return $grassPane
    }

    const glassPane = h(this.c('.grass-pane'))
    const $glassPane = $(glassPane)
    document.body.appendChild(glassPane)
    $glassPane.on('click', this.hideAll)
    return $glassPane
  }
  private createMenuItem(item: IMenuItemOptions) {
    const { c } = this
    if (item.type === 'separator') {
      return h(c('.separator'))
    }

    const el = h(c('.item'))
    const $el = $(el)

    $el.text(item.label as string)
    if (item.type === 'submenu') {
      $el.append(`<span class="${this.c('icon icon-arrow-right')}"></span>`)
    }
    $el.on('mouseover', () => {
      this.highlight($el)
      if (item.submenu) {
        if (item.submenu !== this.subMenu) {
          this.hideSubMenu()
        }
        this.showSubMenu(item.submenu, $el)
      } else {
        this.hideSubMenu()
      }
    })
    $el.on('mouseleave', () => {
      if (!this.subMenu || this.subMenu !== item.submenu) {
        this.highlight(null)
      }
    })
    $el.on('click', () => {
      if (item.click) {
        item.click()
        this.hideAll()
      }
    })

    return el
  }
  private highlight($el: $.$ | null) {
    if (this.highlighted === $el) {
      return
    }

    if ($el) {
      $el.addClass(this.c('active'))
    }
    if (this.highlighted) {
      this.highlighted.rmClass(this.c('active'))
    }
    this.highlighted = $el
  }
  private bindEvent() {
    this.$container.on('click', (e) => e.stopPropagation())
  }
}

module.exports = Menu
module.exports.default = Menu

interface IMenuItemOptions {
  type?: 'normal' | 'separator' | 'submenu'
  label?: string
  submenu?: Menu
  click?: () => void
}
