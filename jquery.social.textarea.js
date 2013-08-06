/**
 * jQuery Social Textarea v0.1.0
 * Copyright 2013 Choy Peng Kong
 * An unobstrusive Facebook/Twitter style textarea plugin for JQuery.
 *
 * Dual licensed under the MIT and GPL
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function( $ ) {
	
	$.fn.SocialTextarea = function( options ) {
		
		return this.each(function () {
			
			var opts = $.extend( {}, $.fn.SocialTextarea.defaults, options ),
				$this = $( this );
			
			// wrapper 'this' in a div. wr:wrapper
			$this.wrap('<div class="'+opts.wrClass+'" />');
			// wrapper becomes 'this'
			$this = $this.closest('.'+opts.wrClass);
			// create two divs. ce:contenteditable, re:result
			$this.html('<div class="'+opts.ceClass+'"></div><div class="'+opts.reClass+'"></div>');
			
			// make content editable div behave like a normal textarea with placeholder
			$this.find('.'+opts.ceClass).attr('contenteditable', 'true')
				.html('<span class="'+opts.cepClass+'">'+opts.placeholder+'</span>')
				.on('focus', function(e) { if ($(this).text() == opts.placeholder) $(this).html('<br>'); })
				.on('blur', function(e) { if ($(this).text() == '') $(this).html('<span class="'+opts.cepClass+'">'+opts.placeholder+'</span>'); });
			
			// the magic happens everytime a keyup event is detected...
			$this.bind("keyup", function(e) {
				// get the key code
				$this.code = (e.keyCode ? e.keyCode : e.which);
				// get size of result list
				$this.resultSize = $this.find('.'+opts.reClass+' ul li').size();
				
				// hijack these keys (enter, arrow up, arrow down, esc) if result list isn't empty
				// instead of acting on editablecontent element it will act on result list instead
				if (($this.resultSize && ($this.code == 38 || $this.code == 40)) || 
					$this.code == 13 || $this.code == 27) return;
				
				// caret offset within element
				$this.caret = getCaretCharacterOffsetWithin(this);
				// html content of element
				$this.html = $this.find('.'+opts.ceClass).html();
				// line object
				$this.line = getCaretLine($this.html, $this.caret);
				// caret offset within html
				$this.caretHtml = getCaretOffsetInHtml($this.html, $this.caret);
				
				// if @ occurs on this line...
				if ($this.line.value.lastIndexOf("@") > -1) {
					// get substring from start of @ to cursor position
					$this.mention = $this.line.value.substring($this.line.value.lastIndexOf("@")+1, $this.line.position);
					// if there is something...
					if ($this.mention) {
						// make ajax get call to the server to search for @ mention results
						$.getJSON(opts.source, { term:$this.mention }, function(data) {
							// create empty result list
							$this.find('.'+opts.reClass).html('<ul></ul>');
							// reset result list selected item counter
							$this.selected = 0;
							// populate result list
							$this.data = data;
							$.each(data, function(index, value) {
								$this.find('.'+opts.reClass+' ul').append(
									'<li>'+(value.img?'<span class="'+opts.reiClass+'"><img src="'+value.img+'" alt="" /></span>':'')+value.label2+'</li>');
							});
							// get size of result list
							$this.resultSize = $this.find('.'+opts.reClass+' ul li').size();
							// do something on list item mouse enter
							$this.find('.'+opts.reClass+' ul li').on('mouseenter', function() {
								$this.selected = $this.find('.'+opts.reClass+' ul li').index(this)+1;
								highlightListItem();
							});
							// do something on list item click
							$this.find('.'+opts.reClass+' ul li').on('click', function() {
								selectListItem();
							});
							// remove empty result list
							if ($this.resultSize == 0) {
								$this.find('.'+opts.reClass).html('');
							}
						});
					}
				}
			});
			
			$this.bind("keydown", function(e) {
				// get the key code
				$this.code = (e.keyCode ? e.keyCode : e.which);
				// get size of result list
				$this.resultSize = $this.find('.'+opts.reClass+' ul li').size();
				if ($this.resultSize) {
					switch ($this.code) {
						case 13: // Enter
							e.preventDefault();
							selectListItem();
						break;
						case 27: // ESC
							e.preventDefault();
							$this.find('.'+opts.reClass).html('');
						break;
						case 38: // Arrow Up
							e.preventDefault();
							$this.selected = $this.selected-1;
							if ($this.selected == -1) $this.selected = $this.resultSize;
							highlightListItem();
						break;
						case 40: // Arrow Down
							e.preventDefault();
							$this.selected = $this.selected+1;
							if ($this.selected > $this.resultSize) $this.selected = 0;
							highlightListItem();
						break;
					}
				}
			});
			
			function highlightListItem()
			{
				$this.find('.'+opts.reClass+' ul li').removeClass('highlight');
				if ($this.selected-1 !== -1) {
					$this.find('.'+opts.reClass+' ul li').eq($this.selected-1).addClass('highlight');
				}
			}
			
			function selectListItem()
			{
				// remove result list
				$this.find('.'+opts.reClass).html('');
				
				// replace the term being searched with the selected list item's label within a highlight span
				var start = $this.html.substring(0, $this.html.substring(0, $this.caretHtml).lastIndexOf("@"));
				var middle = $this.html.substring($this.html.substring(0, $this.caretHtml).lastIndexOf("@"), $this.caretHtml);
				var end = $this.html.substr($this.caretHtml);
				$this.find('.'+opts.ceClass).html(start+'<span class="highlight">'+$this.data[$this.selected-1].label+'</span>&nbsp;'+end);
				
				// set caret position to after the inserted @mention with a space
				var pos = $this.caret-middle.length+$this.data[$this.selected-1].label.length+1;
				setSelectionByCharacterOffsets($this.find('.'+opts.ceClass)[0], pos, pos);
			}
		});
		
		function getCaretLine(html, caret)
		{
			html = strip_tags(html
				.replace(/<br>$/, '') // for firefox, strip the ending <br>
				.replace(/<div(.*?)><br>/g, '<div>') // for webkit browsers (safari and chrome)...
				.replace(/<div(.*?)>/g, '\n') // ...use opening div tag as newline
				.replace(/<br>/g, '\n') // for firefox, use <br> as newline
				.replace(/\&nbsp;/g, ' ')
				.replace(/\&lt;/g, '<')
				.replace(/\&gt;/g, '>'))
				.replace(/\&amp;/g, '&');
				
			var line, length = 0;
			$.each(html.split("\n"), function(index, value) {
				length += value.length;
				if (caret-length <= 0) {
					line = {index:index, value:value, position:value.length+(caret-length)};
					return false; // return false to break from the loop
				}
			});
			return line;
		}
		
		function getCaretOffsetInHtml(html, caret)
		{
			var position = 0;
			var count = true;
			var index = 0;
			while (index != html.length) {
				if (html.substr(index, 1) == '<') count = false;
				if (html.substr(index, 1) == '&') count = false;
				if (html.substr(index, 1) == ';') count = true;
				if (caret == position) return index;
				if (count === true) {
					position++;
				}
				if (html.substr(index, 1) == '>') count = true;
				index++;
			}
			return index;
		}
	};
	
	/* 
	 * Credit for this function goes to Kevin van Zonneveld
	 * http://phpjs.org/functions/strip_tags/ 
	 */
	function strip_tags(input, allowed) {
		allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
		var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
		commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
		return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
			return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
		});
	}
	
	/* 
	 * Credit for this function goes to Tim Down 
	 * http://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container/4812022#4812022 
	 */
	function getCaretCharacterOffsetWithin(element) {
	    var caretOffset = 0;
	    var doc = element.ownerDocument || element.document;
	    var win = doc.defaultView || doc.parentWindow;
	    var sel;
	    if (typeof win.getSelection != "undefined") {
	        var range = win.getSelection().getRangeAt(0);
	        var preCaretRange = range.cloneRange();
	        preCaretRange.selectNodeContents(element);
	        preCaretRange.setEnd(range.endContainer, range.endOffset);
	        caretOffset = preCaretRange.toString().length;
	    } else if ( (sel = doc.selection) && sel.type != "Control") {
	        var textRange = sel.createRange();
	        var preCaretTextRange = doc.body.createTextRange();
	        preCaretTextRange.moveToElementText(element);
	        preCaretTextRange.setEndPoint("EndToEnd", textRange);
	        caretOffset = preCaretTextRange.text.length;
	    }
	    return caretOffset;
	}
	
	/*
	 * Credit for this function goes to Tim Down 
	 * http://stackoverflow.com/questions/16095155/javascript-contenteditable-set-cursor-caret-to-index
	 */
	var setSelectionByCharacterOffsets = null;
	
	if (window.getSelection && document.createRange) {
		setSelectionByCharacterOffsets = function(containerEl, start, end) {
	        var charIndex = 0, range = document.createRange();
	        range.setStart(containerEl, 0);
	        range.collapse(true);
	        var nodeStack = [containerEl], node, foundStart = false, stop = false;
	
	        while (!stop && (node = nodeStack.pop())) {
	            if (node.nodeType == 3) {
	                var nextCharIndex = charIndex + node.length;
	                if (!foundStart && start >= charIndex && start <= nextCharIndex) {
	                    range.setStart(node, start - charIndex);
	                    foundStart = true;
	                }
	                if (foundStart && end >= charIndex && end <= nextCharIndex) {
	                    range.setEnd(node, end - charIndex);
	                    stop = true;
	                }
	                charIndex = nextCharIndex;
	            } else {
	                var i = node.childNodes.length;
	                while (i--) {
	                    nodeStack.push(node.childNodes[i]);
	                }
	            }
	        }
	
	        var sel = window.getSelection();
	        sel.removeAllRanges();
	        sel.addRange(range);
	    }
	} else if (document.selection) {
		setSelectionByCharacterOffsets = function(containerEl, start, end) {
			var textRange = document.body.createTextRange();
			textRange.moveToElementText(containerEl);
			textRange.collapse(true);
			textRange.moveEnd("character", end);
			textRange.moveStart("character", start);
			textRange.select();
		};
	}
	
	$.fn.SocialTextarea.defaults = {
		source: 		'data.json',
		placeholder: 	'Write something...',
		wrClass: 		'social-textarea-wrapper',
		ceClass: 		'social-textarea-content-editable',
		cepClass: 		'social-textarea-content-editable-placeholder',
		reClass: 		'social-textarea-result',
		reiClass: 		'social-textarea-result-item-image'
	};	
})(jQuery);